# Terminal Automator

A VS Code extension that helps developers run and manage terminal commands directly from dedicated command files with status tracking.

## Features

- Execute terminal commands from special `.terminal` files
- Track command execution status with visual indicators
- Expand environment variables within commands
- Define custom variables within the file for reuse

## Usage

Create a file with the `.terminal` extension and structure it like this:

```
### Command Name
your command here
```

Click the "▶ Execute" CodeLens above the command to run it in the VS Code terminal.

## Variables

Terminal Automator supports both environment variables and custom variables defined within your file.

### Custom Variables

Define custom variables in a special section at the beginning of your file:

```
### $VARIABLES
api_version=v1
endpoint=users
query=name=john&active=true
```

Then use them in your commands:

```
### Hello
echo 'Hello from terminal'
```

### Environment Variables

Terminal Automator supports various ways to use environment variables in your commands:

#### Supported Syntax

1. **Process.env Style (recommended)**: 
   ```
   {process.env.VARIABLE_NAME}
   ```
2. **Shell Style with Braces**: 
   ```
   ${VARIABLE_NAME}
   ```
3. **Simple Shell Style**: 
   ```
   $VARIABLE_NAME
   ```

## Examples

#### Using Custom Variables with Environment Variables

```
### $VARIABLES
endpoint=documents/generate
payload={"id": "12345"}

### API Request
curl --location '{process.env.BASE_URL}/${endpoint}' \
  --header 'Content-Type: application/json' \
  --data '${payload}'
```

#### Database Query Example

```
### $VARIABLES
query=SELECT * FROM users LIMIT 10;

### Database Connection
psql -h {process.env.DB_HOST} -U ${DB_USER} -d $DB_NAME -c "${query}"
```

## Environment Variable Helper

When your command contains environment variables, a "🔍 Get Env Var" CodeLens appears next to the Execute button. This helps with debugging when variables aren't expanding as expected.

## Safety & Security

This extension only executes commands when explicitly triggered by the user - never automatically. All commands are executed in VS Code's integrated terminal with the same permissions as if you typed them manually.

We recommend reviewing all commands in `.terminal` files before execution, especially when working with files from external sources.

## License

[MIT](LICENSE.md)

