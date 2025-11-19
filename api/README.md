# GameX API

Simple Rust API for indexing GameX marketplace games using MongoDB.

## Features

- Register new games published through GameX platform
- Query all registered games
- Built with Axum web framework
- MongoDB for data persistence
- CORS enabled for frontend integration

## Prerequisites

- Rust (latest stable version)
- Docker and Docker Compose (recommended)
- OR MongoDB (if not using Docker)

## Setup

### Option 1: Using Docker (Recommended)

1. **Start MongoDB with Docker Compose**
   ```bash
   docker-compose up -d
   ```

   This starts:
   - MongoDB on `localhost:27017`
   - Mongo Express (web UI) on `http://localhost:8081`

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```

   The default `.env` configuration works with Docker:
   ```
   MONGODB_URI=mongodb://localhost:27017
   DATABASE_NAME=gamex
   PORT=3000
   ```

3. **Build and Run**
   ```bash
   cargo build
   cargo run
   ```

   The API will start on `http://0.0.0.0:3000`

4. **Stop MongoDB**
   ```bash
   docker-compose down
   ```

### Option 2: Using Local MongoDB Installation

1. **Install MongoDB** (if not already installed)
   ```bash
   # macOS
   brew install mongodb-community
   brew services start mongodb-community

   # Ubuntu/Debian
   sudo apt-get install mongodb
   sudo systemctl start mongodb
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` file with your MongoDB configuration:
   ```
   MONGODB_URI=mongodb://localhost:27017
   DATABASE_NAME=gamex
   PORT=3000
   ```

3. **Build and Run**
   ```bash
   cargo build
   cargo run
   ```

   The API will start on `http://0.0.0.0:3000`

## API Endpoints

### POST /games
Register a new game in the marketplace.

**Request Body:**
```json
{
  "collection_address": "string",
  "candy_machine_address": "string",
  "name": "string",
  "description": "string",
  "image_url": "string",
  "executable_url": "string",
  "creator": "string",
  "metadata_uri": "string"
}
```

**Response:** `201 Created`
```json
{
  "_id": "ObjectId",
  "collection_address": "string",
  "candy_machine_address": "string",
  "name": "string",
  "description": "string",
  "image_url": "string",
  "executable_url": "string",
  "creator": "string",
  "metadata_uri": "string",
  "created_at": "ISO 8601 datetime"
}
```

### GET /games
Retrieve all registered games.

**Response:** `200 OK`
```json
[
  {
    "_id": "ObjectId",
    "collection_address": "string",
    "candy_machine_address": "string",
    "name": "string",
    "description": "string",
    "image_url": "string",
    "executable_url": "string",
    "creator": "string",
    "metadata_uri": "string",
    "created_at": "ISO 8601 datetime"
  }
]
```

### GET /games/search
Search for games by name (case-insensitive partial match).

**Query Parameters:**
- `q` (required) - Search query string

**Example:** `/games/search?q=mario`

**Response:** `200 OK`
```json
[
  {
    "_id": "ObjectId",
    "collection_address": "string",
    "candy_machine_address": "string",
    "name": "Super Mario Game",
    "description": "string",
    "image_url": "string",
    "executable_url": "string",
    "creator": "string",
    "metadata_uri": "string",
    "created_at": "ISO 8601 datetime"
  }
]
```

## Testing

Using cURL:

```bash
# Create a game
curl -X POST http://localhost:3000/games \
  -H "Content-Type: application/json" \
  -d '{
    "collection_address": "ABC123...",
    "candy_machine_address": "XYZ789...",
    "name": "My Awesome Game",
    "description": "A fun game built with GameX",
    "image_url": "https://ipfs.io/ipfs/...",
    "executable_url": "https://ipfs.io/ipfs/...",
    "creator": "wallet_address_here",
    "metadata_uri": "https://ipfs.io/ipfs/..."
  }'

# Get all games
curl http://localhost:3000/games

# Search games by name
curl "http://localhost:3000/games/search?q=mario"
```

## Development

Run in development mode with auto-reload:
```bash
cargo install cargo-watch
cargo watch -x run
```

## Project Structure

```
api/
├── src/
│   ├── main.rs          # Entry point and router setup
│   ├── db.rs            # MongoDB connection
│   ├── handlers.rs      # Request handlers
│   └── models.rs        # Data models
├── Cargo.toml           # Dependencies
├── docker-compose.yml   # MongoDB Docker setup
├── .env.example         # Environment template
└── README.md
```

## License

MIT
