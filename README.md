# Terminal Executor

A Visual Studio Code extension that allows you to execute terminal commands directly from `.terminal` files. Each command block gets an "Execute" button through CodeLens that runs the command in an integrated terminal.

## Features

- **Easy Command Organization**: Structure your frequently-used commands in `.terminal` files with descriptive titles
- **One-Click Execution**: Execute any command directly with the CodeLens "▶ Execute" button
- **Persistent Terminal**: Commands run in a dedicated "Terminal Executor" instance that's reused between executions
- **Simple Syntax**: Just add `### Title` before your command blocks - no complex configuration needed
- **Multi-Line Support**: Full support for complex multi-line commands including quotes, backslashes, and special characters
- **Visual Status Indicators**: Shows execution status (✓ Success, ✗ Error, ⟳ Executing...)
- **Execution Timestamps**: Shows how long ago a command was executed

## Usage

1. Create a file with the `.terminal` extension
2. Structure your file with command blocks like this:

