package usecases

import (
	"bro-chat/internal/domain/entities"
	"bro-chat/internal/domain/repositories"
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

type UserUsecase struct {
	userRepo repositories.UserRepository
}

func NewUserUsecase(userRepo repositories.UserRepository) *UserUsecase {
	return &UserUsecase{
		userRepo: userRepo,
	}
}

func (u *UserUsecase) Register(ctx context.Context, req *entities.UserRegisterRequest) (*entities.User, error) {
	// Check if user already exists
	existingUser, _ := u.userRepo.GetByEmail(ctx, req.Email)
	if existingUser != nil {
		return nil, errors.New("user with this email already exists")
	}

	// Check username availability
	existingUsername, _ := u.userRepo.GetByUsername(ctx, req.Username)
	if existingUsername != nil {
		return nil, errors.New("username already taken")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Create user
	user := &entities.User{
		Username:  req.Username,
		Email:     req.Email,
		Password:  string(hashedPassword),
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Phone:     req.Phone,
		IsOnline:  false,
	}

	if err := u.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (u *UserUsecase) Login(ctx context.Context, req *entities.UserLoginRequest) (*entities.User, error) {
	user, err := u.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Update online status
	u.userRepo.UpdateOnlineStatus(ctx, user.ID, true)

	return user, nil
}

func (u *UserUsecase) GetProfile(ctx context.Context, userID primitive.ObjectID) (*entities.User, error) {
	return u.userRepo.GetByID(ctx, userID)
}

func (u *UserUsecase) UpdateProfile(ctx context.Context, userID primitive.ObjectID, req *entities.UserUpdateRequest) (*entities.User, error) {
	user, err := u.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Update fields
	if req.FirstName != "" {
		user.FirstName = req.FirstName
	}
	if req.LastName != "" {
		user.LastName = req.LastName
	}
	if req.Avatar != "" {
		user.Avatar = req.Avatar
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}

	if err := u.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (u *UserUsecase) SearchUsers(ctx context.Context, query string) ([]*entities.User, error) {
	return u.userRepo.SearchUsers(ctx, query, 20)
}

func (u *UserUsecase) UpdateOnlineStatus(ctx context.Context, userID primitive.ObjectID, isOnline bool) error {
	return u.userRepo.UpdateOnlineStatus(ctx, userID, isOnline)
}
