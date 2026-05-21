import { MongoClient, ServerApiVersion } from "mongodb"

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

// Module-level cache for production (survives across requests in the same container instance)
let _prodClientPromise: Promise<MongoClient> | undefined

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error("MONGODB_URI environment variable is not set")

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri, options).connect()
    }
    return global._mongoClientPromise
  }

  if (!_prodClientPromise) {
    _prodClientPromise = new MongoClient(uri, options).connect()
  }
  return _prodClientPromise
}

export default getClientPromise
