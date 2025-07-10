[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/portal-labs-infrastructure-number-guessing-game-mcp-server-badge.png)](https://mseep.ai/app/portal-labs-infrastructure-number-guessing-game-mcp-server)

# Number Guessing Game MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A demonstration Model Context Protocol (MCP) server implemented in TypeScript. It showcases a dynamic, session-based architecture where each user gets their own set of tools and resources, managed by a central controller. This server hosts a simple number guessing game.

Access it at: [https://mcp.number-guessing-game.portal.one/mcp](https://mcp.number-guessing-game.portal.one/mcp)

Find more remote servers at: [https://remote-mcp-servers.com/](https://remote-mcp-servers.com/)

Read our article talking about the benefits of dynamic MCP servers:

[https://portal.one/blog/dynamic-mcp-servers-tame-complexity/](https://portal.one/blog/dynamic-mcp-servers-tame-complexity/)

Here's an example of interacting with the server manually. Notice the tools change depending on the current game state.

https://github.com/user-attachments/assets/8bb15870-2adc-4412-a072-4fc4eb14bbef

And a video of an agent interacting with the server. You can't see in the video, but the tools available to the agent are changing as well based on the game state.

https://github.com/user-attachments/assets/d7d338a2-8a93-46c3-b4a9-1a6b4caf9dc0

This project is intended as a learning resource and a practical example for building dynamic, multi-user MCP applications.

## Table of Contents

1.  [Key Features](#key-features)
2.  [Architectural Overview](#architectural-overview)
3.  [Prerequisites](#prerequisites)
4.  [Getting Started](#getting-started)
5.  [Running the Server](#running-the-server)
6.  [Interacting with the Server](#interacting-with-the-server)
7.  [Project Structure](#project-structure)
8.  [Key Concepts Demonstrated](#key-concepts-demonstrated)
9.  [Contributing](#contributing)
10. [License](#license)

## Key Features

- **True Multi-User Sessions:** Each connecting user gets their own isolated game state and set of MCP entities.
- **Dynamic MCP Tools:** Tools (`start_game`, `guess_number`, `give_up`) are enabled or disabled on a per-user basis, reflecting their individual game state.
- **Dynamic MCP Resources:** The `game_state` resource is created and destroyed per-user as they start and end games.
- **Clean, Scalable Architecture:**
  - A **single global `McpServer`** handles all connections.
  - An **Express.js controller** manages the lifecycle of each user session.
  - **Session-scoped entities** (tools, resources, game logic) are created on-demand.
  - **State Pattern:** Manages the game's flow (Lobby, Playing) for each user.
- **TypeScript Implementation:** Fully typed for better maintainability and developer experience.
- **Firestore Integration:** Persists game state and high scores, making the server stateless and scalable.

## Architectural Overview

The server follows a modern, scalable pattern where a central controller manages ephemeral, session-specific resources.

1.  **Global Server Config (`src/mcp_setup/index.ts`):** A **McpServer** instance is created when the application starts. It acts as a "blank slate" connection manager and does not contain any tools or resources itself.

2.  **HTTP Controller (`src/controllers/mcp.controller.ts`):** This is the brain of the application.

    - It handles all incoming HTTP requests to the `/mcp` endpoint.
    - When a new user connects, it creates a `StreamableHTTPServerTransport`.
    - It uses the transport's lifecycle hooks (`onsessioninitialized` and `onclose`) to manage the user's session.

3.  **Session Initialization (`onsessioninitialized`):** When a user's transport is ready, the controller:

    - Creates a **new, unique set of MCP entities** for that user by calling the setup functions in `src/mcp_setup/tools` and `src/mcp_setup/resources`.
    - Creates a **new `GameContext`** instance, linking it to the user's session ID and their unique MCP entities.
    - Loads the user's state from Firestore (via `GameSessionService`) and uses the State Pattern (`LobbyState` or `PlayingState`) to enable/disable the correct tools for their session.

4.  **Session Destruction (`onclose`):** When a user disconnects, the controller:
    - **Unregisters and destroys** all tools and resources that were created for that specific user, preventing memory leaks.
    - Cleans up the transport from its list of active connections.

This architecture ensures that each user's UI state (e.g., which tools are enabled) is completely isolated, stateful, and managed dynamically, while the server itself remains scalable.

## Prerequisites

- Node.js (v18.x or later recommended)
- npm or yarn
- Access to a Google Cloud project with Firestore enabled.

## Getting Started

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/portal-labs-infrastructure/number-guessing-game-mcp-server
    cd number-guessing-game-mcp-server
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

### Configuration

1.  **Set up Google Cloud Authentication:** Ensure your environment is authenticated to your Google Cloud project. For local development, you can use the gcloud CLI:
    ```bash
    gcloud auth application-default login
    ```
2.  **Create a `.env` file:** Copy the example file.
    ```bash
    cp .env.example .env
    ```
3.  **Edit `.env`:** Fill in the required environment variables.
    - `PORT`: The port for the server to run on (e.g., `8083`).
    - `GCP_PROJECT_ID`: Your Google Cloud Project ID.
    - `BASE_URL`: The public-facing URL of your server (e.g., `http://localhost:8083`).
    - `OAUTH_ISSUER_URL`: The base URL of your OAuth provider.
    - `DOCS_URL`: A link to your service's documentation.

## Running the Server

### Dev Mode (for development with hot-reloading):

```bash
npm run dev
```

### Production Mode:

**Compile TypeScript:**

```bash
npm run build
```

**Start the server:**

```bash
npm start
```

You should see output indicating the server is running and connected to Firestore.

## Interacting with the Server

### Live Server

You'll need an MCP client that supports the following capabilities:

- OAuth2 (with dynamic client registration)
- Tool notifications
- Resource notifications

You can use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), but it does not have Tool and Resource notifications so you have to manually refresh the tools and resources.

You use the the [Portal One](https://portal.one) web client and find the server in the list of available MCP servers and click 'connect'.

See other clients that support dynamic MCP tools and resources (discovery) in the [MCP SDK Example Clients](https://modelcontextprotocol.io/clients).

### Local

Make sure the server can be accessed by the client. If you're running the server locally, and using a web based client, you can use a tool like [ngrok](https://ngrok.com/) to expose the server to the internet:

```bash
ngrok http http://localhost:8083
```

If you're using a client on localhost, you can connect directly to `http://localhost:8083/mcp`.

## Project Structure

```
src/
├── config/
│   └── index.ts                # Loads and exports environment variables
├── controllers/
│   └── mcp.controller.ts       # Manages session lifecycles and creates entities on-demand
├── game/
│   ├── commands/               # Command Pattern: Encapsulates user actions
│   │   ├── command.interface.ts
│   │   ├── give-up.command.ts
│   │   ├── guess-number.command.ts
│   │   └── start-game.command.ts
│   ├── core/
│   │   ├── game-context.ts       # Central game logic coordinator for a SINGLE session
│   │   ├── game-session-service.ts # Handles all Firestore interactions (get/set state)
│   │   ├── game-types.ts       # Core TypeScript interfaces for the game
│   │   ├── resource-factory.ts # (Not used in current setup, but available)
│   │   └── tool-factory.ts     # (Not used in current setup, but available)
│   ├── states/                 # State Pattern: Manages game flow (Lobby, Playing)
│   │   ├── game-state.interface.ts
│   │   ├── lobby.state.ts
│   │   └── playing.state.ts
│   └── utils/
│       └── game-constants.ts   # Shared game constants
├── index.ts                    # Main application entry point (Express server setup)
├── mcp_setup/
│   ├── index.ts                # Creates the single, global McpServer instance
│   ├── resources/              # Factory functions for creating MCP resources
│   │   ├── index.ts            # Barrel file for exporting all resource setups
│   │   └── ... (setup-banner-image-resource.ts, etc.)
│   └── tools/                  # Factory functions for creating MCP tools
│       ├── index.ts            # Barrel file for exporting all tool setups
│       └── ... (setup-guess-number-tool.ts, etc.)
├── routes/
│   └── mcp.routes.ts           # Defines the Express routes for /mcp
└── services/
    └── firestore.service.ts    # Initializes the global Firestore client
```

## Key Concepts Demonstrated

- **Dynamic, Session-Scoped MCP:** The core of this architecture. Tools and resources are not global; they are created and destroyed for each user session.
- **Lifecycle Management:** Using transport hooks (`onsessioninitialized`, `onclose`) to manage the setup and teardown of session resources.
- **Stateful Services over HTTP:** Implementing persistent, isolated user sessions over a stateless protocol.
- **State Pattern:** Managing complex state transitions for each user's game flow.
- **Firestore for State Persistence:** Decoupling the server's runtime from the game state, allowing for horizontal scaling and resilience.
- **TypeScript Best Practices:** Using types for robust code in a real-world, scalable application structure.

## Contributing

Contributions are welcome! If you have ideas for improvements, new features, or find any bugs, please feel free to open an issue or a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
