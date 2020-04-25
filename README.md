# A prototype of a simple key-value store (interview test)

```
Test assignment for Node.js:

Develop a key-value database with the following features:

1) Receives an incoming message from RabbitMQ queue `config.INCOME_QUEUE`.
   Sends the response to `config.OUTCOME_QUEUE`.
   Develop and document your own message format.
2) Supports getting, setting, and deleting entries.
3) Provides two persistence options: snapshot and log.

Use docker for local deployment and docker-compose for database persistence.
```

```
Тестовое задание для Node.js:

Написать key-value базу данных, соответствующую следующим условиям:

1) Принимает входящие сообщения по RabbitMQ из очереди `config.INCOME_QUEUE`.
   Отправляет ответ в очередь `config.OUTCOME_QUEUE`.
   Формат сообщений разработать и задокументировать самостоятельно.
2) Поддерживает операции чтения, вставки, удаления.
3) Обеспечивает персистентность данных через механизмы snapshot + log.

Тестовое задание должно запускаться через docker. Должен быть написан
docker-compose файл, обеспечивающий персистентность базы.

```

## Quick start
Run the app
```
docker-compose up
```

After `kvs` (key-value store) has connected to `RabbitMQ`, in another terminal
window open shell in `kvs` container:
```
docker exec -it kvs sh
```

`cd` into the `bin` folder and start the cli:
```
cd build/bin
./cli.js
```

### Commands

The responses can be of two kinds: `OK` and `ERR`. An example of an error message:
```
> get
ERR Invalid number of arguments.
```

#### Set
Syntax: `set [key] [value]` or `set [key] "[value]"`

If the value has spaces, it must be double quoted.

`OK 1` means one entry has been added to the database.
```
> set pet:1 cat
OK 1
```

`OK 0` means no entry has been added to the database since this an entry with such a key
is already present in the database. The value has been updated though.
```
> set pet:1 dog
OK 0 
```

An example of a value with spaces.
```
> set user:1 "Violet Evergaden"
OK 1
```

#### Get
Syntax: `get [key]`

`-OK` means that there's no such entry in the database.
```
> get pet:100
-OK
```

`OK [value]` is the value retrieved by key.
```
> get pet:1
OK dog
```

#### Delete
Syntax: `delete [key]`

`OK 1` means one entry has been deleted.
```
> delete pet:1
OK 1
```

`OK 0` means no entry has been deleted.
```
> delete pet:1
OK 0
```

### Config

You can find an example in the root directory. It is expected to bo copied
into the container. The default path for the config inside the container is
`/usr/local/etc/kvs/kvs-config.json`. `CONFIG_PATH` environmental variable
can be used to set a different config location. Config has the following
interface:

```typescript
interface Config {
  // kvs reads messages from this queue
  // default: "inboundQueue"
  inboundQueue: string;
  // kvs sends message responses to this queue
  // default: "outboundQueue"
  outboundQueue: string;
  // Whether to save snapshots of the current state periodically
  // default: true
  snapshotOn: boolean;
  // How often to save snapshots in milliseconds.
  // default: 10 * 1000
  snapshotInterval: number;
  // Whether to keep a log of operations
  // default: true
  appendLogOn: boolean;
  // Where to keep snapshots and logs
  // default: "/usr/local/etc/kvs/data/"
  dataPath: string;
}

```

### Persistence

#### Snapshots

For demo purposes, a snapshot of the current state is made every 10 seconds by default. If no
modifying operations (`set` or `delete`) have been performed within  the last 10
seconds, then no snapshot is made. Upon restart `kvs` restores its state from the
snapshot with the latest timestamp.

#### Logs

For demo purposes, modyfing operation queries are saved to log files. No more than 5
per file.

##### TODO
Currently, only saving to log files works. `kvs` does not restore its state from
them. What could be done to make it work:

1. Add a flag that tells `kvs` which method to use to restore state.
1. Preferably, optimize log files so that they don't have contiguous idempotent operations, etc.
    For example, if we have a log file like this:
    ```
    set pet:1 cat
    set pet:1 cat
    set pet:1 cat
    ```
    It should be optimized to this:
    ```
    set pet:1 cat
    ```
1. Upon start, restore state from the files. Here's the possible pseudo code:
    ```typescript
   function restoreStateFromLogFiles() {
     // filePaths must be sorted from earliest to latest 
     const filePaths = getLogFilePaths();
     for (const filePath of filePaths) {
       const queries = readFile(filePath).split('\n');
       for (const query of queries) {
         queryHandler(query)
       }
     }
   }
   ```
