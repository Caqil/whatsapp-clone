package services

import (
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"bro-chat/internal/domain/entities"

	_ "image/gif"

	"github.com/nfnt/resize"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FileUploadService struct {
	uploadDir    string
	thumbnailDir string
	maxFileSize  int64
	allowedTypes map[string][]string
}

type UploadResult struct {
	FileName     string                    `json:"fileName"`
	FileURL      string                    `json:"fileUrl"`
	ThumbnailURL string                    `json:"thumbnailUrl,omitempty"`
	FileSize     int64                     `json:"fileSize"`
	MediaType    string                    `json:"mediaType"`
	Dimensions   *entities.MediaDimensions `json:"dimensions,omitempty"`
	Duration     int                       `json:"duration,omitempty"`
}

func NewFileUploadService() *FileUploadService {
	uploadDir := "./uploads"
	thumbnailDir := "./uploads/thumbnails"

	// Create directories if they don't exist
	os.MkdirAll(uploadDir, 0755)
	os.MkdirAll(thumbnailDir, 0755)

	return &FileUploadService{
		uploadDir:    uploadDir,
		thumbnailDir: thumbnailDir,
		maxFileSize:  100 * 1024 * 1024, // 100MB
		allowedTypes: map[string][]string{
			"image":    {".jpg", ".jpeg", ".png", ".gif", ".webp"},
			"video":    {".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm"},
			"audio":    {".mp3", ".wav", ".ogg", ".aac", ".m4a"},
			"document": {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"},
		},
	}
}

func (s *FileUploadService) UploadFile(file *multipart.FileHeader, userID primitive.ObjectID) (*UploadResult, error) {
	// Validate file size
	if file.Size > s.maxFileSize {
		return nil, fmt.Errorf("file too large: %d bytes, max allowed: %d bytes", file.Size, s.maxFileSize)
	}

	// Get file extension and determine type
	ext := strings.ToLower(filepath.Ext(file.Filename))
	mediaType := s.getMediaType(ext)
	if mediaType == "" {
		return nil, fmt.Errorf("unsupported file type: %s", ext)
	}

	// Generate unique filename
	timestamp := time.Now().Unix()
	fileName := fmt.Sprintf("%s_%d_%s", userID.Hex(), timestamp, file.Filename)
	filePath := filepath.Join(s.uploadDir, fileName)

	// Save file
	src, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()

	dst, err := os.Create(filePath)
	if err != nil {
		return nil, err
	}
	defer dst.Close()

	if _, err = io.Copy(dst, src); err != nil {
		return nil, err
	}

	result := &UploadResult{
		FileName:  fileName,
		FileURL:   fmt.Sprintf("/uploads/%s", fileName),
		FileSize:  file.Size,
		MediaType: mediaType,
	}

	// Process based on media type
	switch mediaType {
	case "image":
		if err := s.processImage(filePath, result); err != nil {
			return nil, err
		}
	case "video":
		if err := s.processVideo(filePath, result); err != nil {
			return nil, err
		}
	case "audio":
		if err := s.processAudio(filePath, result); err != nil {
			return nil, err
		}
	}

	return result, nil
}

func (s *FileUploadService) getMediaType(ext string) string {
	for mediaType, extensions := range s.allowedTypes {
		for _, allowedExt := range extensions {
			if ext == allowedExt {
				return mediaType
			}
		}
	}
	return ""
}

func (s *FileUploadService) processImage(filePath string, result *UploadResult) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	// Decode image to get dimensions
	img, _, err := image.Decode(file)
	if err != nil {
		return err
	}

	bounds := img.Bounds()
	result.Dimensions = &entities.MediaDimensions{
		Width:  bounds.Dx(),
		Height: bounds.Dy(),
	}

	// Create thumbnail
	if err := s.createThumbnail(filePath, result); err != nil {
		return err
	}

	return nil
}

func (s *FileUploadService) createThumbnail(originalPath string, result *UploadResult) error {
	file, err := os.Open(originalPath)
	if err != nil {
		return err
	}
	defer file.Close()

	img, format, err := image.Decode(file)
	if err != nil {
		return err
	}

	// Resize to thumbnail (max 200x200)
	thumbnail := resize.Thumbnail(200, 200, img, resize.Lanczos3)

	// Create thumbnail filename
	thumbnailName := "thumb_" + result.FileName
	thumbnailPath := filepath.Join(s.thumbnailDir, thumbnailName)

	thumbnailFile, err := os.Create(thumbnailPath)
	if err != nil {
		return err
	}
	defer thumbnailFile.Close()

	// Encode thumbnail
	switch format {
	case "jpeg":
		err = jpeg.Encode(thumbnailFile, thumbnail, &jpeg.Options{Quality: 80})
	case "png":
		err = png.Encode(thumbnailFile, thumbnail)
	default:
		err = jpeg.Encode(thumbnailFile, thumbnail, &jpeg.Options{Quality: 80})
	}

	if err != nil {
		return err
	}

	result.ThumbnailURL = fmt.Sprintf("/uploads/thumbnails/%s", thumbnailName)
	return nil
}

func (s *FileUploadService) processVideo(filePath string, result *UploadResult) error {
	// For video processing, you would typically use ffmpeg
	// This is a simplified version - in production, use ffmpeg-go or similar

	// TODO: Implement video processing
	// - Extract video dimensions
	// - Get video duration
	// - Create video thumbnail

	return nil
}

func (s *FileUploadService) processAudio(filePath string, result *UploadResult) error {
	// For audio processing, you would typically use ffmpeg
	// This is a simplified version

	// TODO: Implement audio processing
	// - Get audio duration
	// - Extract metadata

	return nil
}

func (s *FileUploadService) DeleteFile(fileName string) error {
	filePath := filepath.Join(s.uploadDir, fileName)
	thumbnailPath := filepath.Join(s.thumbnailDir, "thumb_"+fileName)

	// Delete main file
	if err := os.Remove(filePath); err != nil && !os.IsNotExist(err) {
		return err
	}

	// Delete thumbnail if exists
	if err := os.Remove(thumbnailPath); err != nil && !os.IsNotExist(err) {
		// Ignore thumbnail deletion errors
	}

	return nil
}

// Utility functions for file validation
func (s *FileUploadService) IsValidImageType(ext string) bool {
	for _, allowedExt := range s.allowedTypes["image"] {
		if ext == allowedExt {
			return true
		}
	}
	return false
}

func (s *FileUploadService) IsValidVideoType(ext string) bool {
	for _, allowedExt := range s.allowedTypes["video"] {
		if ext == allowedExt {
			return true
		}
	}
	return false
}

func (s *FileUploadService) IsValidAudioType(ext string) bool {
	for _, allowedExt := range s.allowedTypes["audio"] {
		if ext == allowedExt {
			return true
		}
	}
	return false
}
