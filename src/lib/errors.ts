import { Command } from "./Command";

export class NoCommandError extends Error {
  constructor() {
    super("No command was provided.");
    this.name = "NoCommandError";
  }
}

const invalidCommandErrorMessage = `Invalid command. Must be one of ${Object.values(Command).join(", ")}.`;
export class InvalidCommandError extends Error {
  constructor() {
    super(invalidCommandErrorMessage);
    this.name = "InvalidCommandError";
  }
}

export class InvalidNumberOfArgumentsError extends Error {
  constructor() {
    super("Invalid number of arguments. Maybe you forgot to add the second double quote?");
  }
}
