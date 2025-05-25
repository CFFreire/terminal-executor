# Terminal Automator

A VS Code extension that helps developers run and manage terminal commands directly from dedicated command files with status tracking.

## Features

- Execute terminal commands from special `.terminal` files
- Track command execution status with visual indicators
- Expand environment variables within commands
- Define custom variables within the file for reuse
- **Reusable command blocks**: Define blocks and include them in other blocks with `#include blockName`

## Usage

Create a file with the `.terminal` extension and structure it like this:

```
### $VARIABLES
API_URL=https://api.com

### Block 1
echo "I am Block 1"

### Block 2
#include bloque1
echo "I am in Block 2"

### Principal
#include Block 2
echo "End"
```

Click the "▶ Execute" CodeLens above any block to run it in the VS Code terminal. If a block contains `#include blockName`, the referenced block will be expanded and executed in sequence.

## Variables

Terminal Automator supports both environment variables and custom variables defined within your file. All variables are expanded in included blocks as well.

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

#### Using Custom Variables, Includes, and Environment Variables

```
### $VARIABLES
endpoint=documents/generate
payload={"id": "12345"}

### api_call
curl --location '{process.env.BASE_URL}/${endpoint}' \
  --header 'Content-Type: application/json' \
  --data '${payload}'

### main
#include api_call
echo "API call finished"
```

#### Database Query Example

```
### $VARIABLES
query=SELECT * FROM users LIMIT 10;

### db_query
psql -h {process.env.DB_HOST} -U ${DB_USER} -d $DB_NAME -c "${query}"

### main
#include db_query
echo "Query finished"
```

## Environment Variable Helper

When your command contains environment variables, a "🔍 Get Env Var" CodeLens appears next to the Execute button. This helps with debugging when variables aren't expanding as expected.

## Safety & Security

This extension only executes commands when explicitly triggered by the user - never automatically. All commands are executed in VS Code's integrated terminal with the same permissions as if you typed them manually.

If you include a block that does not exist, the extension will show an error and stop execution. Recursive includes are also detected and prevented.

We recommend reviewing all commands in `.terminal` files before execution, especially when working with files from external sources.

## License

[MIT](LICENSE.md)

