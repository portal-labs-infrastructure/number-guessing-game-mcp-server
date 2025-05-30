# Number Guessing Game MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A demonstration Model Context Protocol (MCP) server implemented in TypeScript, showcasing dynamic tool and resource management, stateful HTTP sessions, and clean architectural patterns (State, Command, EventEmitter). This server hosts a simple number guessing game.

This project is intended as a learning resource and a practical example for a demonstration on building dynamic MCP applications.

## Table of Contents

1.  [Key Features](#key-features)
2.  [Architectural Overview](#architectural-overview)
    - [Core MCP Server](#core-mcp-server)
    - [Game Logic (`/game`)](#game-logic-game)
    - [MCP Setup (`/mcp_setup`)](#mcp-setup-mcp_setup)
    - [HTTP Controller (`/controllers`)](#http-controller-controllers)
    - [Event-Driven Updates](#event-driven-updates)
3.  [Prerequisites](#prerequisites)
4.  [Getting Started](#getting-started)
    - [Installation](#installation)
    - [Configuration (Optional)](#configuration-optional)
5.  [Running the Server](#running-the-server)
6.  [Interacting with the Server (API Guide)](#interacting-with-the-server-api-guide)
    - [1. Initialize a Session](#1-initialize-a-session)
    - [2. List Available Tools & Resources](#2-list-available-tools--resources)
    - [3. Start a Game](#3-start-a-game)
    - [4. Play the Game (Make a Guess)](#4-play-the-game-make-a-guess)
    - [5. Give Up](#5-give-up)
    - [6. Receiving Server-Sent Events (SSE)](#6-receiving-server-sent-events-sse)
    - [7. End a Session](#7-end-a-session)
7.  [Project Structure](#project-structure)
8.  [Key Concepts Demonstrated](#key-concepts-demonstrated)
9.  [Future Enhancements (Ideas)](#future-enhancements-ideas)
10. [Contributing](#contributing)
11. [License](#license)

## Key Features

- **Stateful HTTP Sessions:** Each client connection via HTTP maintains its own game state.
- **Dynamic MCP Tools:**
  - Tools (`start_game`, `guess_number`, `give_up`) become available/unavailable based on the game state.
  - The `guess_number` tool's input schema dynamically updates to reflect valid guess ranges.
- **Dynamic MCP Resources:**
  - A `game_state` resource appears when a game starts and disappears when it ends.
  - A `highscores` resource updates when a game is won.
- **Clean Architecture:**
  - **State Pattern:** Manages the game's flow (Lobby, Playing).
  - **Command Pattern:** Encapsulates actions triggered by MCP tools.
  - **EventEmitter:** Decouples game logic from MCP-specific resource management.
- **TypeScript Implementation:** Fully typed for better maintainability and developer experience.
- **MCP SDK Usage:** Demonstrates practical use of the `@modelcontextprotocol/sdk`.
- **JSON Resource Content:** Shows how to serve structured data as JSON, correctly formatting it as a Base64 encoded string in the `blob` field with `mimeType: "application/json"`.

## Architectural Overview

This server is designed with a separation of concerns to keep the codebase organized and maintainable.

### Core MCP Server

- An instance of `McpServer` from the `@modelcontextprotocol/sdk` is created for each active HTTP session.
- This server instance is responsible for handling the MCP communication with a single client.

### Game Logic (`/game`)

This directory contains the core business logic for the number guessing game, independent of MCP specifics.

- **`GameContext` (`/game/core/game-context.ts`):**
  - The central coordinator for a single game session.
  - Holds the current game data (`ActiveGame`), high scores, and references to MCP entities (tools, resources) relevant to this session.
  - Manages transitions between game states using the State pattern.
  - Extends `EventEmitter` to announce state changes.
- **State Pattern (`/game/states`):**
  - Defines different states the game can be in (e.g., `LobbyState`, `PlayingState`).
  - Each state (`IGameState` implementations) controls:
    - Which actions (tool invocations) are valid.
    - How game data is modified.
    - Which MCP tools should be enabled/disabled.
    - What data the `game_state` resource should expose.
- **Command Pattern (`/game/commands`):**
  - Each user action initiated via an MCP tool (e.g., starting a game, making a guess) is encapsulated as a command (`ICommand` implementations like `StartGameCommand`, `GuessNumberCommand`).
  - Commands interact with the `GameContext` to modify game data and trigger state transitions.
  - Tool handlers in the MCP setup layer create and execute these commands.

### MCP Setup (`/mcp_setup`)

This directory is responsible for bridging the game logic with the Model Context Protocol.

- **`mcp-game-server.ts`:** Contains `createGameServerInstance()`, the factory function that:
  - Creates an `McpServer` instance.
  - Instantiates the `GameContext`.
  - Sets up MCP tools by linking them to game commands (see `/mcp_setup/tools`).
  - Sets up static MCP resources (like `highscores`) and links their getters to `GameContext` (see `/mcp_setup/resources`).
  - Registers event listeners to handle dynamic resource management.
- **Tool Setup (`/mcp_setup/tools`):** Modular functions for defining each MCP tool, its schema, and its handler (which typically executes a game command).
- **Resource Setup (`/mcp_setup/resources`):** Modular functions for defining MCP resources, their URIs, metadata, and getter functions.
- **Event Handlers (`/mcp_setup/event_handlers`):**
  - `game-state-change.handler.ts`: Listens to `STATE_CHANGED` events from `GameContext`. Based on the new game state, it dynamically adds or removes the `game_state` MCP resource.

### HTTP Controller (`/controllers`)

- **`mcpController.ts`:** An Express.js controller that handles HTTP requests to the `/mcp` endpoint.
  - Manages `StreamableHTTPServerTransport` instances for each session.
  - Handles session initialization, reuse, and termination using the `mcp-session-id` header.
  - For new sessions, it calls `createGameServerInstance()` to set up a dedicated MCP server and game logic.
  - Supports Server-Sent Events (SSE) on `GET /mcp` for real-time notifications from the server.

### Event-Driven Updates

- `GameContext` uses Node.js `EventEmitter` to signal significant events, primarily `STATE_CHANGED`.
- The `mcp-game-server.ts` (via `game-state-change.handler.ts`) listens for these events to perform MCP-specific actions, like creating or removing the `game_state` resource. This decouples the core game logic from the specifics of MCP resource management.
- Changes to resource content (e.g., high scores updating, game state message changing) are signaled by calling `resource.update({})` on the respective resource object. The SDK then re-evaluates the resource's getter and sends a `resourceUpdated` notification if the content has changed.

## Prerequisites

- Node.js (v18.x or later recommended)
- npm or yarn

## Getting Started

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/portal-labs-infrastructure/number-guessing-game-mcp-server
    cd mcp-number-guessing-game-server
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

### Configuration (Optional)

- The server runs on port `8080` by default. This can be changed by renaming `.env.example` to `.env` and updating the PORT value.
- No other external configuration (e.g., database) is required for this demo.

## Running the Server

### Dev Mode (for development with hot-reloading):

```bash
npm run dev
```

This will start the server with `nodemon`, which automatically reloads on file changes.

### Production Mode (for production-like environment):

**Compile TypeScript:**

```bash
npm run build
```

**Start the server:**

```bash
npm start
```

You should see output indicating the server is running:

```
MCP Game Server (HTTP Stateful) listening on port 8080
Root MCP endpoint available at /mcp (POST, GET, DELETE)
```

## Interacting with the Server

You'll need an MCP client that supports dynamic tools and resources (discovery).

We've created [Portal One](https://portal.one) as a web-based MCP client that supports dynamic tools and discovery. You can use it to test the game flow.

Make sure the server can be accessed by the client. If you're running the server locally, you can use a tool like [ngrok](https://ngrok.com/) to expose it to the internet:

```bash
ngrok http http://localhost:8080
```

See other clients that support dynamic MCP tools and resources (discovery) in the [MCP SDK Example Clinets](https://modelcontextprotocol.io/clients).

## Project Structure

```
number-guessing-game-mcp-server/
├── build/ # Compiled JavaScript output
├── node_modules/
├── src/
│ ├── controllers/
│ │ └── mcpController.ts # Express controller for HTTP session & request handling
│ ├── game/
│ │ ├── commands/ # Command pattern implementations (StartGameCommand, etc.)
│ │ │ ├── command.interface.ts
│ │ │ └── ... (specific command files)
│ │ ├── core/
│ │ │ ├── game-context.ts # Central game logic coordinator, state manager
│ │ │ └── game-types.ts # Core game data interfaces (ActiveGame, McpEntities)
│ │ ├── states/ # State pattern implementations (LobbyState, PlayingState)
│ │ │ ├── game-state.interface.ts
│ │ │ └── ... (specific state files)
│ │ └── utils/
│ │   └── game-constants.ts # Game constants (MAX_ATTEMPTS, etc.)
│ ├── mcp_setup/ # Logic for setting up MCP server, tools, resources
│ │ ├── event_handlers/ # Handlers for GameContext events (e.g., state changes)
│ │ │ ├── game-state-change.handler.ts
│ │ │ └── index.ts
│ │ ├── resources/ # Setup functions for MCP resources
│ │ │ ├── setup-game-state-resource.ts
│ │ │ ├── setup-highscores-resource.ts
│ │ │ └── index.ts
│ │ ├── tools/ # Setup functions for MCP tools
│ │ │ ├── setup-guess-number-tool.ts
│ │ │ ├── ... (other tool setup files)
│ │ │ └── index.ts
│ │ └── mcp-game-server.ts # Orchestrates creation of McpServer with game logic
│ ├── index.ts # Main application entry point (Express server setup)
│ └── routes/
│   └── mcpRoutes.ts # Express routes for /mcp endpoint
├── .gitignore
├── package.json
├── package-lock.json
├── README.md # This file
└── tsconfig.json
```

## Key Concepts Demonstrated

- **Model Context Protocol (MCP):** Core concepts like tools, resources, notifications, and client-server interaction.
- **Dynamic Server Behavior:** How an MCP server can change its available tools, resources, and even tool schemas based on internal state or user interaction.
- **State Pattern:** Managing complex state transitions and behaviors in a clean, organized way for the game flow.
- **Command Pattern:** Decoupling the "request" of an action (tool call) from its "execution" (game logic).
- **EventEmitter for Decoupling:** Using events to communicate between the game logic (`GameContext`) and the MCP setup layer, reducing direct dependencies.
- **Stateful Services over HTTP:** Implementing persistent sessions using HTTP headers and server-side session management.
- **Server-Sent Events (SSE):** Providing real-time, unidirectional communication from server to client for notifications.
- **TypeScript Best Practices:** Using types for robust code, modular structure.
- **JSON Resource Formatting:** Correctly providing JSON data as a Base64 encoded string in the `blob` field with `mimeType: "application/json"`.

## Future Enhancements

- Add more complex game mechanics.
- Implement user authentication.
- Persist high scores to a database.
- Add more sophisticated error handling and reporting.
- Write unit and integration tests.

## Contributing

Contributions are welcome! If you have ideas for improvements, new features, or find any bugs, please feel free to:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/YourFeature` or `bugfix/YourBugfix`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some feature'`).
5.  Push to the branch (`git push origin feature/YourFeature`).
6.  Open a Pull Request.

Please ensure your code adheres to the existing style and that any new features are well-documented.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
