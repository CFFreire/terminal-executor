# Change Log

All notable changes to the "Terminal Automator" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-05-05

### Added
- Initial release of Terminal Automator
- Support for `.terminal` file format
- CodeLens provider for executing commands directly from editor
- Visual status indicators for command execution
- Environment variable expansion in commands
- Custom variable support in terminal commands
- Integration with VS Code's terminal API

### Security
- Commands are sanitized before execution
- Extension requires trusted workspaces for security