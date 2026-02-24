import * as dotenv from 'dotenv'
import pg from 'pg'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

dotenv.config()

// Cache for secrets to avoid excessive API calls
let secretsCache = null
let cacheTimestamp = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Fetches database credentials from AWS Secrets Manager
 * @returns {Promise<Object>} Database credentials object
 */
const getSecretsFromSecretsManager = async () => {
  // Return cached secrets if still valid
  if (secretsCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_TTL_MS)) {
    console.log('Using cached secrets from Secrets Manager')
    return secretsCache
  }

  const secretName = process.env.AWS_SECRET_NAME || 'devsu-app/rds-credentials'
  const region = process.env.AWS_REGION || 'us-east-1'

  const client = new SecretsManagerClient({ region })

  try {
    console.log(`Fetching secrets from AWS Secrets Manager: ${secretName}`)
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
      }),
    )

    if (!response.SecretString) {
      throw new Error('Secret value is empty')
    }

    const secret = JSON.parse(response.SecretString)

    // Cache the secrets
    secretsCache = {
      host: secret.host,
      port: secret.port || 5432,
      database: secret.database,
      user: secret.username,
      password: secret.password,
    }
    cacheTimestamp = Date.now()

    console.log('Successfully fetched and cached secrets from Secrets Manager')
    return secretsCache
  } catch (error) {
    console.error('Error fetching secrets from Secrets Manager:', error.message)
    throw new Error(`Failed to fetch secrets from Secrets Manager: ${error.message}`)
  }
}

/**
 * Gets database configuration from environment variables (fallback for local development)
 * @returns {Object} Database configuration object
 */
const getConfigFromEnv = () => ({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
})

/**
 * Initializes database configuration by fetching from Secrets Manager or environment variables
 * @returns {Promise<Object>} Database configuration object
 */
const getDatabaseConfig = async () => {
  // Check if we should use Secrets Manager (production) or environment variables (local)
  const useSecretsManager = process.env.USE_SECRETS_MANAGER === 'true'

  if (useSecretsManager) {
    try {
      return await getSecretsFromSecretsManager()
    } catch (error) {
      console.error('Failed to fetch from Secrets Manager, falling back to environment variables')
      return getConfigFromEnv()
    }
  }
  console.log('Using environment variables for database configuration')
  return getConfigFromEnv()
}

// Initialize pool as null, will be created after fetching config
let pool = null

/**
 * Creates and returns the database connection pool
 * @returns {Promise<pg.Pool>} PostgreSQL connection pool
 */
export const getPool = async () => {
  if (pool) {
    return pool
  }

  const config = await getDatabaseConfig()

  pool = new pg.Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  console.log(`Database pool created for host: ${config.host}`)
  return pool
}

export const initDatabase = async () => {
  const poolInstance = await getPool()
  const client = await poolInstance.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        dni VARCHAR(255) UNIQUE NOT NULL
      )
    `)
    console.log('Database initialized')
  } catch (error) {
    console.error('Error initializing database:', error.message)
    throw error
  } finally {
    client.release()
  }
}

// Export getPool as default for backward compatibility
export default getPool

