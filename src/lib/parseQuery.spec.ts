import { GetQuery, parseQuery, SetQuery } from "./parseQuery";
import { InvalidCommandError, InvalidNumberOfArgumentsError, NoCommandError } from "./errors";
import { Command } from "./Command";

describe("parseQuery", () => {
  it("throws NoCommandError if query is an empty string", () => {
    expect(() => parseQuery("")).toThrow(new NoCommandError());
  });

  it("throws InvalidCommandError if command is invalid", () => {
    expect(() => parseQuery("nani")).toThrow(new InvalidCommandError());
  });

  it("throws InvalidNumberOfArguments if Get has no arguments", () => {
    expect(() => parseQuery("get")).toThrow(new InvalidNumberOfArgumentsError());
  });

  it("throws InvalidNumberOfArguments if Delete has no arguments", () => {
    expect(() => parseQuery("delete")).toThrow(new InvalidNumberOfArgumentsError());
  });

  it("throws InvalidNumberOfArguments if Set has no arguments", () => {
    expect(() => parseQuery("set")).toThrow(new InvalidNumberOfArgumentsError());
  });

  it("throws InvalidNumberOfArguments if Set has only one argument", () => {
    expect(() => parseQuery("set user:1")).toThrow(new InvalidNumberOfArgumentsError());
  });

  it("throws InvalidNumberOfArguments if value starts with a quote but doesn't end with it", () => {
    expect(() => parseQuery('set user:1 "Violet Evergarden')).toThrow(new InvalidNumberOfArgumentsError());
  });

  it("returns a GetQuery if the command is Get", () => {
    const expected: GetQuery = {
      command: Command.Get,
      key: "user:1",
    };

    expect(parseQuery("get user:1")).toEqual(expected);
  });

  it("returns a SetQuery if the command is Set", () => {
    const expected: SetQuery = {
      command: Command.Set,
      key: "user:1",
      value: "Violet",
    };

    expect(parseQuery('set user:1 "Violet"')).toEqual(expected);
  });

  it("returns a SetQuery if the command is Set and the value is unquoted", () => {
    const expected: SetQuery = {
      command: Command.Set,
      key: "user:1",
      value: "Violet",
    };

    expect(parseQuery("set user:1 Violet")).toEqual(expected);
  });

  it("returns a SetQuery if the command is Set and has spaces", () => {
    const expected: SetQuery = {
      command: Command.Set,
      key: "user:1",
      value: "Violet Evergarden",
    };

    expect(parseQuery('set user:1 "Violet Evergarden"')).toEqual(expected);
  });

  it("returns a SetQuery if the command is Set and has spaces", () => {
    const expected: SetQuery = {
      command: Command.Set,
      key: "user:1",
      value: "Violet Evergarden",
    };

    expect(parseQuery('set user:1 "Violet Evergarden"')).toEqual(expected);
  });
});
// describe("parseQuery", () => {
//   it('throws NoCommandError is query is an empty string', () => {
//     expect(() => originalParseQuery('')).toThrow(new NoCommandError())
//   })
// });
