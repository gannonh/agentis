# MongoDB CLI

This folder contains scripts for managing the MongoDB Docker container.

## MongoDB CLI Tool

The `mongodb-cli.sh` script provides a simple command-line interface for managing the MongoDB Docker container defined in the project's `mongodb-compose.yml` file.

### Usage

```bash
./mongodb-cli.sh [command]
```

### Available Commands

| Command | Description |
|---------|-------------|
| `start` | Start the MongoDB container |
| `stop` | Stop the MongoDB container |
| `restart` | Restart the MongoDB container |
| `status` | Check the status of the MongoDB container |
| `logs` | Show container logs |
| `shell` | Open MongoDB shell |
| `backup` | Create a backup of MongoDB data |
| `restore <file>` | Restore from a backup file |
| `help` | Show help message |

### Examples

Start the MongoDB container:
```bash
./mongodb-cli.sh start
```

Check the status:
```bash
./mongodb-cli.sh status
```

Create a backup:
```bash
./mongodb-cli.sh backup
```

Restore from a backup:
```bash
./mongodb-cli.sh restore /path/to/backup/file.gz
```

### MongoDB Connection Details

- **Host**: localhost:27017
- **Username**: admin
- **Password**: password
- **Connection String**: `mongodb://admin:password@localhost:27017/`

> **Note**: For production use, please change the default credentials in the `mongodb-compose.yml` file.