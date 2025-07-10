# WhatsApp Clone - Go Backend

A real-time messaging application backend built with Go, Gin, and MongoDB following clean architecture principles.

## 🚀 Features

- User registration and authentication
- Real-time messaging with WebSocket
- Direct and group chats
- Message read receipts
- Online status tracking
- User search functionality
- JWT-based authentication
- Clean architecture implementation

## 🏗️ Architecture

The project follows clean architecture principles with clear separation of concerns:

- **Domain Layer**: Core business entities and repository interfaces
- **Use Case Layer**: Business logic and application rules
- **Interface Layer**: HTTP handlers, middleware, and WebSocket management
- **Infrastructure Layer**: Database connections, configurations, and external services

## 📦 Tech Stack

- **Language**: Go 1.21+
- **Web Framework**: Gin
- **Database**: MongoDB
- **Authentication**: JWT
- **Real-time Communication**: WebSocket (Gorilla WebSocket)
- **Password Hashing**: bcrypt

## 🛠️ Installation

1. **Prerequisites**:
   - Go 1.21 or higher
   - MongoDB (local or cloud)

2. **Install dependencies**:
   ```bash
   go mod tidy
   ```

3. **Environment Setup**:
   - Copy `.env` file and update the values
   - Set your MongoDB URI and JWT secret

4. **Run the application**:
   ```bash
   go run cmd/server/main.go
   ```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/search?q=query` - Search users

### Chats
- `POST /api/chats` - Create new chat
- `GET /api/chats` - Get user's chats
- `GET /api/chats/:chatId` - Get specific chat

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/chat/:chatId` - Get chat messages
- `PUT /api/messages/:messageId/read` - Mark message as read

### WebSocket
- `GET /api/ws?token=<jwt_token>` - WebSocket connection for real-time messaging

## 🔧 Configuration

Environment variables in `.env`:

```env
PORT=8080
MONGO_URI=mongodb://localhost:27017
JWT_SECRET=your-super-secret-jwt-key
DB_NAME=whatsapp_clone
```

## 🚦 Getting Started

1. **Register a user**:
   ```bash
   curl -X POST http://localhost:8080/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "johndoe",
       "email": "john@example.com",
       "password": "password123",
       "firstName": "John",
       "lastName": "Doe"
     }'
   ```

2. **Login**:
   ```bash
   curl -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "john@example.com",
       "password": "password123"
     }'
   ```

3. **Use the JWT token from login response for authenticated requests**

## 🔮 Future Enhancements

- File upload and sharing
- Message encryption
- Push notifications
- Group management (add/remove members, admin roles)
- Message search functionality
- Voice and video calls
- Message reactions
- Status/Stories feature

## 📝 License

This project is licensed under the MIT License.
