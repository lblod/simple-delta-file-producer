# simple-delta-file-producer

This simple service listens to all the deltas of a stack and generates diff files to sync data to
external applications.
Diff files are generated since a specific timestamp and can be fetched by a consuming service.

The service is based on another implementation that includes configuration files on data to sync
which can be found [here](https://github.com/lblod/loket-mandatarissen-producer).

## Tutorials
### Add the service to a stack

Add the service to your `docker-compose.yml`:

```
  simple-delta-file-producer:
    image: lblod/simple-delta-file-producer
    volumes:
      - ./data/files:/share
```

The produced diff files will be written to a subfolder `./deltas` of the mounted volume `./data/files`.

Next, configure the delta-notifier in `./config/delta/rules.js` to send delta messages for all changes:
```javascript
export default [
  {
    match: {
      // anything
    },
    callback: {
      url: 'http://functionarissen-producer/delta',
      method: 'POST'
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 1000,
      ignoreFromSelf: true
    }
  }
  // Other delta listeners
]
```

Finally add the following dispatcher rules in `./config/dispatcher/dispatcher.ex` to make the endpoint to list produced diff files available for the consuming service.

```elixir
  get "/sync/functionarissen/files/*path" do
    Proxy.forward conn, path, "http://functionarissen-producer/files/"
  end
```

The service assumes a [file service](https://github.com/mu-semtech/file-service) hosting the files mounted in `/share` is already available in the stack for the consumer to download the diff files.

Restart the updated services
```
docker-compose restart delta-notifier dispatcher
```

Create the newly added service
```
docker-compose up -d
```

## Reference
### Configuration
#### Environment variables
The following enviroment variables can be optionally configured:
* `APP_NAME (default: simple-delta-file-producer)`: the name of the application generating the delta files.
* `DELTA_INTERVAL (in ms, default: 1000)`: interval to keep generated delta's in an in-memory cache before writing to a file.
* `LOG_INCOMING_DELTA (default: "false")`: log the delta message as received from the delta-notifier to the console.
* `LOG_OUTGOING_DELTA (default: "false")`: log the resulting delta message that will be written to the diff file to the console.
* `LOG_DELTA_REWRITE (default: "false")`: verbose log output during the rewrite of the incoming delta to the resulting delta. Only useful for debugging purposes.
* `RELATIVE_FILE_PATH (default: "deltas")`: relative path of the delta files compared to the root folder of the file service that will host the files.
* `FILE_GRAPH (default: "http://mu.semte.ch/application")`: graph on which the file data should be saved in the database.

### API
#### POST /delta
Endpoint that receives delta's from the [delta-notifier](https://github.com/mu-semtech/delta-notifier). The delta's are rewritten based on the configured export for functionarissen. The resulting delta's are written to files that can be retrieved via the `GET /files` endpoint.

#### GET /files?since=<datetime>
Get a list of diff files generated since the request timestamp. The list is ordered by creation date, oldest first. This is also the order in which the files must be consumed.

Example response:
```json
{
  "data": [
    {
      "type": "files",
      "id": "3be63fd0-c030-11ea-a482-b30a6eeb477f",
      "attributes": {
        "name": "delta-2020-07-07T08:59:58.409Z.json",
        "created": "2020-07-07T08:59:58.413Z"
      }
    },
    {
      "type": "files",
      "id": "3fd04b40-c030-11ea-a482-b30a6eeb477f",
      "attributes": {
        "name": "delta-2020-07-07T09:00:04.977Z.json",
        "created": "2020-07-07T09:00:04.980Z"
      }
    }
  ]
}
```

### File format
The generated delta files follow the [delta-notifier v0.0.1](https://github.com/mu-semtech/delta-notifier#v001) format.

### Model
#### Diff files
The generated diff files are written to the store according to the [model of the file service](https://github.com/mu-semtech/file-service#resources). The virtual file is enriched with the following properties:

| Name      | Predicate       | Range           | Definition                                                                                                                    |
|-----------|-----------------|-----------------|-------------------------------------------------------------------------------------------------------------------------------|
| publisher | `dct:publisher` | `rdfs:Resource` | Publisher of the file, in this case always `<http://data.lblod.info/services/leidinggevendendatabank-functionarissen-producer>` |

## Known limitations
* We can provide types to ignore when processing the delta files.  It has a big limitation in cases
of deltas with deleting information. If we have a resource that we delete, let's say
`?s a Type ; ?p ?o .`, we are going to receive two separate delta, with no particular order, so it
might be first the `?s a Type` triple. But when we'll then receive `?s ?p ?o` and check the store
what's his type, the type will already be deleted so we the service is going to think it's not an
ignored type and write it down to a file.
The current implementation of the core services (delta notifier, database) doesn't allow us to get
the full transaction which prevents us from ensuring a 100% bulletproof blacklist.
* The service keeps an in-memory cache of delta's to write to a file. If the service is killed before the delta's have been written to a file, the delta's are lost. Hence, shortening the `DELTA_INTERVAL`, decreases the chance to loose data on restart.
