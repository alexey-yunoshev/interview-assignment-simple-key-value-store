import { InvalidCommandError, InvalidNumberOfArgumentsError, NoCommandError, BadlyQuotedValueError } from "./errors";
import { Command } from "./Command";

const commands = new Set<string>(Object.values(Command));

function isValidCommand(value: string): value is Command {
  return commands.has(value);
}

function hasValidNumberOfArguments(command: Command, key: string | undefined, rest: Array<string>) {
  switch (command) {
    case Command.Get:
    case Command.Delete:
      return key !== undefined && rest.length === 0;
    case Command.Set:
      return key !== undefined && rest.length > 0;
  }
}

export interface HasCommand<C extends Command> {
  command: C;
}

export interface HasKey {
  key: string;
}

export interface HasValue {
  value: string;
}

export interface GetQuery extends HasCommand<Command.Get>, HasKey {}

export interface DeleteQuery extends HasCommand<Command.Delete>, HasKey {}

export interface SetQuery extends HasCommand<Command.Set>, HasKey, HasValue {}

export type Query = GetQuery | DeleteQuery | SetQuery;

export function isGetQuery(query: Query): query is GetQuery {
  return query.command === Command.Get;
}

export function isDeleteQuery(query: Query): query is DeleteQuery {
  return query.command === Command.Delete;
}

export function isSetQuery(query: Query): query is SetQuery {
  return query.command === Command.Set;
}

function trimQuotes(value: string) {
  return value.substring(1, value.length - 1);
}

function parseValue(strings: Array<string>) {
  let value = "";
  const quote = '"';
  const length = strings.length;
  if (length === 0) {
    return value;
  }

  if (length === 1) {
    value = strings[0];
  } else {
    if (strings[0].startsWith(quote) && strings[length - 1].endsWith(quote)) {
      value = strings.join(" ");
    } else {
      throw new InvalidNumberOfArgumentsError();
    }
  }

  return value.startsWith(quote) && value.endsWith(quote) ? trimQuotes(value) : value;
}

/**
 * I am no yet great at parsing.
 * It can be done much better.
 */
export function parseQuery(query: string): Query {
  if (query === "") {
    throw new NoCommandError();
  }

  const [command, key, ...rest] = query.split(" ");

  if (!isValidCommand(command)) {
    throw new InvalidCommandError();
  }

  if (!hasValidNumberOfArguments(command, key, rest)) {
    throw new InvalidNumberOfArgumentsError();
  }

  switch (command) {
    case Command.Get:
    case Command.Delete:
      return {
        command,
        key,
      };
    case Command.Set:
      return {
        command,
        key,
        value: parseValue(rest),
      };
  }
}
