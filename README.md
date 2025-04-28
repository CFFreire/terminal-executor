# Terminal Executor

A VS Code extension for executing terminal commands directly from files.

## Features

- Execute terminal commands from special terminal files
- Track command execution status
- Expand environment variables within commands
- Define custom variables within the file

## Usage

Create a file with the `.terminal` extension and structure it like this:

```
### Command Name
your command here
```

Click the "▶ Execute" CodeLens above the command to run it in the terminal.

## Variables

Terminal Executor supports both environment variables and custom variables defined within your file.

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
### Get Users
curl --location "https://api.example.com/${api_version}/${endpoint}?${query}"
```

### Environment Variables

Terminal Executor supports various ways to use environment variables in your commands:

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

### Examples

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

#### Database Connection Example

```
### $VARIABLES
query=SELECT * FROM users LIMIT 10;

### Database Connection
psql -h {process.env.DB_HOST} -U ${DB_USER} -d $DB_NAME -c "${query}"
```

#### Running Scripts with Variables

```
### $VARIABLES
script_name=process.js
options=--verbose --no-cache

### Run Script
node {process.env.SCRIPTS_PATH}/${script_name} --env=${NODE_ENV} ${options}
```

## Environment Variable Helper

When your command contains environment variables, a "🔍 Get Env Var" CodeLens appears next to the Execute button. Click it to:

1. Enter the name of any environment variable
2. View its current value
3. Copy the value to your clipboard

This helps with debugging when variables aren't expanding as expected.

## License

MIT

