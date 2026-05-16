import { MongoClient, ServerApiVersion } from "mongodb"

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is not set")
}

const uri = process.env.MONGODB_URI

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

let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  // Hot reload 対策: グローバルにキャッシュして接続を再利用する
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri, options).connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  clientPromise = new MongoClient(uri, options).connect()
}

export default clientPromise
