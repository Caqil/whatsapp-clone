// src/lib/validation.ts
import { z } from 'zod';
import { 
  USER_CONFIG, 
  CHAT_CONFIG, 
  MESSAGE_CONFIG, 
  AUTH_CONFIG,
  DEVICE_TYPES,
  REACTION_TYPES 
} from './constants';

// ========== Authentication Schemas ==========

export const deviceTypeSchema = z.enum(['web', 'mobile', 'desktop']);

export const magicLinkRequestSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(USER_CONFIG.EMAIL.MAX_LENGTH, `Email must be less than ${USER_CONFIG.EMAIL.MAX_LENGTH} characters`),
  deviceType: deviceTypeSchema,
  deviceName: z.string().optional(),
});

export const verifyMagicLinkSchema = z.object({
  token: z
    .string()
    .min(32, 'Invalid token format')
    .regex(/^[a-f0-9]+$/i, 'Invalid token format'),
});

export const qrCodeRequestSchema = z.object({
  deviceType: deviceTypeSchema,
  deviceName: z.string().optional(),
});

export const qrCodeScanSchema = z.object({
  qrCode: z
    .string()
    .min(32, 'Invalid QR code format')
    .regex(/^[a-f0-9]+$/i, 'Invalid QR code format'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const magicLinkUserRegistrationSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(USER_CONFIG.EMAIL.MAX_LENGTH),
  firstName: z
    .string()
    .min(USER_CONFIG.NAME.MIN_LENGTH, `First name must be at least ${USER_CONFIG.NAME.MIN_LENGTH} character`)
    .max(USER_CONFIG.NAME.MAX_LENGTH, `First name must be less than ${USER_CONFIG.NAME.MAX_LENGTH} characters`)
    .regex(USER_CONFIG.NAME.PATTERN, 'First name can only contain letters and spaces'),
  lastName: z
    .string()
    .min(USER_CONFIG.NAME.MIN_LENGTH, `Last name must be at least ${USER_CONFIG.NAME.MIN_LENGTH} character`)
    .max(USER_CONFIG.NAME.MAX_LENGTH, `Last name must be less than ${USER_CONFIG.NAME.MAX_LENGTH} characters`)
    .regex(USER_CONFIG.NAME.PATTERN, 'Last name can only contain letters and spaces'),
  username: z
    .string()
    .min(USER_CONFIG.USERNAME.MIN_LENGTH, `Username must be at least ${USER_CONFIG.USERNAME.MIN_LENGTH} characters`)
    .max(USER_CONFIG.USERNAME.MAX_LENGTH, `Username must be less than ${USER_CONFIG.USERNAME.MAX_LENGTH} characters`)
    .regex(USER_CONFIG.USERNAME.PATTERN, 'Username can only contain letters, numbers, and underscores')
      .refine(
      (username) => !(USER_CONFIG.USERNAME.RESERVED_NAMES as readonly string[]).includes(username.toLowerCase()),
      'This username is not available'
    ),
  phone: z
    .string()
    .regex(USER_CONFIG.PHONE.PATTERN, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  bio: z
    .string()
    .max(USER_CONFIG.BIO.MAX_LENGTH, `Bio must be less than ${USER_CONFIG.BIO.MAX_LENGTH} characters`)
    .optional(),
});

// Legacy password schemas (backward compatibility)
export const userLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

export const userRegistrationSchema = z.object({
  username: z
    .string()
    .min(USER_CONFIG.USERNAME.MIN_LENGTH)
    .max(USER_CONFIG.USERNAME.MAX_LENGTH)
    .regex(USER_CONFIG.USERNAME.PATTERN)
    .refine((username) => !(USER_CONFIG.USERNAME.RESERVED_NAMES as readonly string[]).includes(username.toLowerCase())),
  email: z.string().email().max(USER_CONFIG.EMAIL.MAX_LENGTH),
  password: z.string().min(6).optional(),
  firstName: z
    .string()
    .min(USER_CONFIG.NAME.MIN_LENGTH)
    .max(USER_CONFIG.NAME.MAX_LENGTH)
    .regex(USER_CONFIG.NAME.PATTERN),
  lastName: z
    .string()
    .min(USER_CONFIG.NAME.MIN_LENGTH)
    .max(USER_CONFIG.NAME.MAX_LENGTH)
    .regex(USER_CONFIG.NAME.PATTERN),
  phone: z.string().regex(USER_CONFIG.PHONE.PATTERN).optional().or(z.literal('')),
  bio: z.string().max(USER_CONFIG.BIO.MAX_LENGTH).optional(),
});

// ========== User Schemas ==========

export const userUpdateSchema = z.object({
  firstName: z
    .string()
    .min(USER_CONFIG.NAME.MIN_LENGTH)
    .max(USER_CONFIG.NAME.MAX_LENGTH)
    .regex(USER_CONFIG.NAME.PATTERN)
    .optional(),
  lastName: z
    .string()
    .min(USER_CONFIG.NAME.MIN_LENGTH)
    .max(USER_CONFIG.NAME.MAX_LENGTH)
    .regex(USER_CONFIG.NAME.PATTERN)
    .optional(),
  avatar: z.string().url().optional().or(z.literal('')),
  phone: z.string().regex(USER_CONFIG.PHONE.PATTERN).optional().or(z.literal('')),
  bio: z.string().max(USER_CONFIG.BIO.MAX_LENGTH).optional(),
  username: z
    .string()
    .min(USER_CONFIG.USERNAME.MIN_LENGTH)
    .max(USER_CONFIG.USERNAME.MAX_LENGTH)
    .regex(USER_CONFIG.USERNAME.PATTERN)
    .refine((username) => !(USER_CONFIG.USERNAME.RESERVED_NAMES as readonly string[]).includes(username.toLowerCase()))
    .optional(),
});

export const userSearchSchema = z.object({
  query: z
    .string()
    .min(CHAT_CONFIG.SEARCH.MIN_QUERY_LENGTH, `Search query must be at least ${CHAT_CONFIG.SEARCH.MIN_QUERY_LENGTH} characters`)
    .max(100, 'Search query is too long'),
});

// ========== Chat Schemas ==========

export const chatTypeSchema = z.enum(['direct', 'group']);

export const createChatSchema = z.object({
  type: chatTypeSchema,
  name: z
    .string()
    .min(CHAT_CONFIG.GROUP.NAME.MIN_LENGTH)
    .max(CHAT_CONFIG.GROUP.NAME.MAX_LENGTH)
    .optional(),
  description: z
    .string()
    .max(CHAT_CONFIG.GROUP.DESCRIPTION.MAX_LENGTH)
    .optional(),
  participants: z
    .array(z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user ID format'))
    .min(1, 'At least one participant is required')
    .max(CHAT_CONFIG.GROUP.MAX_PARTICIPANTS, `Maximum ${CHAT_CONFIG.GROUP.MAX_PARTICIPANTS} participants allowed`),
}).refine((data) => {
  // Group chats must have a name
  if (data.type === 'group' && (!data.name || data.name.trim() === '')) {
    return false;
  }
  // Direct chats must have exactly 1 participant (the other user)
  if (data.type === 'direct' && data.participants.length !== 1) {
    return false;
  }
  return true;
}, {
  message: 'Invalid chat configuration',
  path: ['participants'],
});

export const updateChatSchema = z.object({
  name: z
    .string()
    .min(CHAT_CONFIG.GROUP.NAME.MIN_LENGTH)
    .max(CHAT_CONFIG.GROUP.NAME.MAX_LENGTH)
    .optional(),
  description: z
    .string()
    .max(CHAT_CONFIG.GROUP.DESCRIPTION.MAX_LENGTH)
    .optional(),
  avatar: z.string().url().optional().or(z.literal('')),
});

export const chatSearchSchema = z.object({
  query: z
    .string()
    .min(CHAT_CONFIG.SEARCH.MIN_QUERY_LENGTH)
    .max(100),
});

// ========== Message Schemas ==========

export const messageTypeSchema = z.enum([
  'text',
  'image',
  'file',
  'audio',
  'video',
  'document',
  'location',
  'contact'
]);

export const reactionTypeSchema = z.enum(REACTION_TYPES);

export const mediaDimensionsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});

export const sendMessageSchema = z.object({
  chatId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid chat ID format'),
  type: messageTypeSchema,
  content: z
    .string()
    .max(MESSAGE_CONFIG.TEXT.MAX_LENGTH, `Message is too long. Maximum ${MESSAGE_CONFIG.TEXT.MAX_LENGTH} characters allowed`)
    .optional()
    .default(''),
  mediaUrl: z.string().url().optional(),
  mediaType: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().positive().optional(),
  duration: z.number().positive().optional(),
  dimensions: mediaDimensionsSchema.optional(),
  replyToId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
}).refine((data) => {
  // Text messages must have content
  if (data.type === 'text' && (!data.content || data.content.trim() === '')) {
    return false;
  }
  // Media messages must have mediaUrl
  if (['image', 'video', 'audio', 'file', 'document'].includes(data.type) && !data.mediaUrl) {
    return false;
  }
  return true;
}, {
  message: 'Invalid message data',
});

export const messageReactionSchema = z.object({
  messageId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid message ID format'),
  reaction: reactionTypeSchema,
});

export const forwardMessageSchema = z.object({
  messageIds: z
    .array(z.string().regex(/^[a-f\d]{24}$/i))
    .min(1, 'At least one message must be selected')
    .max(10, 'Cannot forward more than 10 messages at once'),
  toChatIds: z
    .array(z.string().regex(/^[a-f\d]{24}$/i))
    .min(1, 'At least one chat must be selected')
    .max(10, 'Cannot forward to more than 10 chats at once'),
});

export const deleteMessageSchema = z.object({
  messageId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid message ID format'),
  deleteForMe: z.boolean().default(true),
});

export const editMessageSchema = z.object({
  messageId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid message ID format'),
  content: z
    .string()
    .min(1, 'Message content cannot be empty')
    .max(MESSAGE_CONFIG.TEXT.MAX_LENGTH),
});

export const messageSearchSchema = z.object({
  chatId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid chat ID format'),
  query: z
    .string()
    .min(1, 'Search query cannot be empty')
    .max(100, 'Search query is too long'),
  limit: z.number().positive().max(100).optional().default(20),
});

export const markMultipleAsReadSchema = z.object({
  messageIds: z
    .array(z.string().regex(/^[a-f\d]{24}$/i))
    .min(1, 'At least one message must be selected')
    .max(100, 'Cannot mark more than 100 messages at once'),
});

// ========== File Upload Schemas ==========

export const fileUploadSchema = z.object({
  file: z.instanceof(File, { message: 'Please select a file' }),
  chatId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  content: z.string().optional(),
}).refine((data) => {
  // Validate file size
  const maxSize = MESSAGE_CONFIG.MEDIA.MAX_FILE_SIZE;
  if (data.file.size > maxSize) {
    return false;
  }
  
  // Validate file type based on category
  const fileType = data.file.type;
  const allowedTypes = [
    ...MESSAGE_CONFIG.MEDIA.IMAGE.ALLOWED_TYPES,
    ...MESSAGE_CONFIG.MEDIA.VIDEO.ALLOWED_TYPES,
    ...MESSAGE_CONFIG.MEDIA.AUDIO.ALLOWED_TYPES,
    ...MESSAGE_CONFIG.MEDIA.DOCUMENT.ALLOWED_TYPES,
  ] as readonly string[];
  
  return allowedTypes.includes(fileType);
}, {
  message: 'Invalid file type or size',
  path: ['file'],
});

export const imageUploadSchema = z.object({
  file: z.instanceof(File),
}).refine((data) => {
  return (MESSAGE_CONFIG.MEDIA.IMAGE.ALLOWED_TYPES as readonly string[]).includes(data.file.type) &&
         data.file.size <= MESSAGE_CONFIG.MEDIA.IMAGE.MAX_SIZE;
}, {
  message: 'Invalid image file',
  path: ['file'],
});

export const videoUploadSchema = z.object({
  file: z.instanceof(File),
}).refine((data) => {
  return (MESSAGE_CONFIG.MEDIA.VIDEO.ALLOWED_TYPES as readonly string[]).includes(data.file.type) &&
         data.file.size <= MESSAGE_CONFIG.MEDIA.VIDEO.MAX_SIZE;
}, {
  message: 'Invalid video file',
  path: ['file'],
});

export const audioUploadSchema = z.object({
  file: z.instanceof(File),
}).refine((data) => {
  return (MESSAGE_CONFIG.MEDIA.AUDIO.ALLOWED_TYPES as readonly string[]).includes(data.file.type) &&
         data.file.size <= MESSAGE_CONFIG.MEDIA.AUDIO.MAX_SIZE;
}, {
  message: 'Invalid audio file',
  path: ['file'],
});

export const documentUploadSchema = z.object({
  file: z.instanceof(File),
}).refine((data) => {
  return (MESSAGE_CONFIG.MEDIA.DOCUMENT.ALLOWED_TYPES as readonly string[]).includes(data.file.type) &&
         data.file.size <= MESSAGE_CONFIG.MEDIA.DOCUMENT.MAX_SIZE;
}, {
  message: 'Invalid document file',
  path: ['file'],
});

// ========== Voice Message Schemas ==========

export const voiceMessageSchema = z.object({
  audioBlob: z.instanceof(Blob),
  duration: z
    .number()
    .positive()
    .max(MESSAGE_CONFIG.VOICE.MAX_DURATION, `Voice message cannot be longer than ${MESSAGE_CONFIG.VOICE.MAX_DURATION / 60} minutes`),
  waveform: z.array(z.number()).optional(),
});

// ========== UI Form Schemas ==========

export const contactFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Contact name is required')
    .max(100, 'Contact name is too long'),
  phone: z
    .string()
    .regex(USER_CONFIG.PHONE.PATTERN, 'Please enter a valid phone number'),
  email: z
    .string()
    .email('Please enter a valid email address')
    .optional()
    .or(z.literal('')),
});

export const locationMessageSchema = z.object({
  latitude: z
    .number()
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude'),
  longitude: z
    .number()
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude'),
  address: z.string().optional(),
  name: z.string().optional(),
});

// ========== Settings Schemas ==========

export const notificationSettingsSchema = z.object({
  messages: z.boolean().default(true),
  sounds: z.boolean().default(true),
  desktop: z.boolean().default(true),
  preview: z.boolean().default(true),
});

export const privacySettingsSchema = z.object({
  lastSeen: z.enum(['everyone', 'contacts', 'nobody']).default('everyone'),
  profilePhoto: z.enum(['everyone', 'contacts', 'nobody']).default('everyone'),
  about: z.enum(['everyone', 'contacts', 'nobody']).default('everyone'),
  readReceipts: z.boolean().default(true),
});

export const chatSettingsSchema = z.object({
  enterToSend: z.boolean().default(true),
  fontSize: z.enum(['small', 'medium', 'large']).default('medium'),
  wallpaper: z.string().url().optional(),
});

export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().default('en'),
  notifications: notificationSettingsSchema,
  privacy: privacySettingsSchema,
  chat: chatSettingsSchema,
});

// ========== Pagination Schemas ==========

export const paginationSchema = z.object({
  limit: z
    .number()
    .positive()
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(20),
  offset: z
    .number()
    .min(0, 'Offset cannot be negative')
    .optional()
    .default(0),
});

export const messagePaginationSchema = z.object({
  chatId: z.string().regex(/^[a-f\d]{24}$/i),
  limit: z
    .number()
    .positive()
    .max(MESSAGE_CONFIG.PAGINATION.MAX_LIMIT)
    .optional()
    .default(MESSAGE_CONFIG.PAGINATION.DEFAULT_LIMIT),
  offset: z.number().min(0).optional().default(0),
  before: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  after: z.string().regex(/^[a-f\d]{24}$/i).optional(),
});

// ========== Group Management Schemas ==========

export const addParticipantsSchema = z.object({
  chatId: z.string().regex(/^[a-f\d]{24}$/i),
  userIds: z
    .array(z.string().regex(/^[a-f\d]{24}$/i))
    .min(1, 'At least one user must be selected')
    .max(10, 'Cannot add more than 10 users at once'),
});

export const removeParticipantSchema = z.object({
  chatId: z.string().regex(/^[a-f\d]{24}$/i),
  userId: z.string().regex(/^[a-f\d]{24}$/i),
});

export const makeAdminSchema = z.object({
  chatId: z.string().regex(/^[a-f\d]{24}$/i),
  userId: z.string().regex(/^[a-f\d]{24}$/i),
});

export const groupSettingsSchema = z.object({
  whoCanSendMessages: z.enum(['everyone', 'admins']).default('everyone'),
  whoCanEditInfo: z.enum(['everyone', 'admins']).default('admins'),
  whoCanAddMembers: z.enum(['everyone', 'admins']).default('admins'),
  disappearingMessages: z.boolean().default(false),
  disappearingTime: z
    .number()
    .positive()
    .optional()
    .superRefine((val, ctx) => {
      // In Zod v3, use ctx to get the parent object
      const { disappearingMessages } = (ctx as any).parent ?? {};
      if (disappearingMessages && !val) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Disappearing time is required when disappearing messages is enabled',
        });
      }
    }),
});

// ========== Error Schemas ==========

export const apiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.record(z.string(), z.any()).optional(),
});

// ========== WebSocket Message Schemas ==========

export const wsMessageSchema = z.object({
  type: z.string(),
  payload: z.any(),
});

export const typingPayloadSchema = z.object({
  chatId: z.string().regex(/^[a-f\d]{24}$/i),
  userId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  username: z.string().optional(),
  isTyping: z.boolean(),
});

// ========== Export Type Inferences ==========

export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;
export type VerifyMagicLinkRequest = z.infer<typeof verifyMagicLinkSchema>;
export type QRCodeRequest = z.infer<typeof qrCodeRequestSchema>;
export type QRCodeScanRequest = z.infer<typeof qrCodeScanSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;
export type MagicLinkUserRegistration = z.infer<typeof magicLinkUserRegistrationSchema>;

export type UserLogin = z.infer<typeof userLoginSchema>;
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type UserSearch = z.infer<typeof userSearchSchema>;

export type CreateChat = z.infer<typeof createChatSchema>;
export type UpdateChat = z.infer<typeof updateChatSchema>;
export type ChatSearch = z.infer<typeof chatSearchSchema>;

export type SendMessage = z.infer<typeof sendMessageSchema>;
export type MessageReaction = z.infer<typeof messageReactionSchema>;
export type ForwardMessage = z.infer<typeof forwardMessageSchema>;
export type DeleteMessage = z.infer<typeof deleteMessageSchema>;
export type EditMessage = z.infer<typeof editMessageSchema>;
export type MessageSearch = z.infer<typeof messageSearchSchema>;

export type FileUpload = z.infer<typeof fileUploadSchema>;
export type ImageUpload = z.infer<typeof imageUploadSchema>;
export type VideoUpload = z.infer<typeof videoUploadSchema>;
export type AudioUpload = z.infer<typeof audioUploadSchema>;
export type DocumentUpload = z.infer<typeof documentUploadSchema>;
export type VoiceMessage = z.infer<typeof voiceMessageSchema>;

export type ContactForm = z.infer<typeof contactFormSchema>;
export type LocationMessage = z.infer<typeof locationMessageSchema>;

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type PrivacySettings = z.infer<typeof privacySettingsSchema>;
export type ChatSettings = z.infer<typeof chatSettingsSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export type Pagination = z.infer<typeof paginationSchema>;
export type MessagePagination = z.infer<typeof messagePaginationSchema>;

export type AddParticipants = z.infer<typeof addParticipantsSchema>;
export type RemoveParticipant = z.infer<typeof removeParticipantSchema>;
export type MakeAdmin = z.infer<typeof makeAdminSchema>;
export type GroupSettings = z.infer<typeof groupSettingsSchema>;

export type TypingPayload = z.infer<typeof typingPayloadSchema>;

// ========== Validation Helper Functions ==========

/**
 * Validate file type and size
 */
export function validateFile(file: File, category: 'image' | 'video' | 'audio' | 'document'): {
  isValid: boolean;
  error?: string;
} {
  const config = MESSAGE_CONFIG.MEDIA[category.toUpperCase() as keyof typeof MESSAGE_CONFIG.MEDIA] as any;
  
  if (!config.ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${config.ALLOWED_TYPES.join(', ')}`
    };
  }
  
  if (file.size > config.MAX_SIZE) {
    return {
      isValid: false,
      error: `File too large. Maximum size: ${(config.MAX_SIZE / (1024 * 1024)).toFixed(1)}MB`
    };
  }
  
  return { isValid: true };
}

/**
 * Validate username availability (would typically make API call)
 */
export function validateUsernameFormat(username: string): {
  isValid: boolean;
  error?: string;
} {
  try {
    const result = z.string()
      .min(USER_CONFIG.USERNAME.MIN_LENGTH)
      .max(USER_CONFIG.USERNAME.MAX_LENGTH)
      .regex(USER_CONFIG.USERNAME.PATTERN)
      .refine((val) => !(USER_CONFIG.USERNAME.RESERVED_NAMES as readonly string[]).includes(val.toLowerCase()))
      .parse(username);
    
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.issues[0]?.message || 'Invalid username'
      };
    }
    return { isValid: false, error: 'Invalid username' };
  }
}

/**
 * Validate chat name based on chat type
 */
export function validateChatName(name: string, type: 'direct' | 'group'): {
  isValid: boolean;
  error?: string;
} {
  if (type === 'direct') {
    return { isValid: true }; // Direct chats don't need names
  }
  
  if (!name || name.trim() === '') {
    return { isValid: false, error: 'Group name is required' };
  }
  
  if (name.length < CHAT_CONFIG.GROUP.NAME.MIN_LENGTH) {
    return { isValid: false, error: 'Group name is too short' };
  }
  
  if (name.length > CHAT_CONFIG.GROUP.NAME.MAX_LENGTH) {
    return { isValid: false, error: 'Group name is too long' };
  }
  
  return { isValid: true };
}

/**
 * Validate message content based on type
 */
export function validateMessageContent(content: string, type: string): {
  isValid: boolean;
  error?: string;
} {
  if (type === 'text') {
    if (!content || content.trim() === '') {
      return { isValid: false, error: 'Message content cannot be empty' };
    }
    
    if (content.length > MESSAGE_CONFIG.TEXT.MAX_LENGTH) {
      return { 
        isValid: false, 
        error: `Message too long. Maximum ${MESSAGE_CONFIG.TEXT.MAX_LENGTH} characters allowed` 
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Create validation error message from Zod error
 */
export function formatValidationError(error: z.ZodError): string {
  const firstError = error.issues[0];
  if (!firstError) return 'Validation error';
  
  const field = firstError.path.join('.');
  const message = firstError.message;
  
  if (field) {
    return `${field}: ${message}`;
  }
  
  return message;
}

/**
 * Safe validation wrapper
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: formatValidationError(error) };
    }
    return { success: false, error: 'Validation failed' };
  }
}

// ========== Export All Schemas ==========

export const schemas = {
  // Auth
  magicLinkRequest: magicLinkRequestSchema,
  verifyMagicLink: verifyMagicLinkSchema,
  qrCodeRequest: qrCodeRequestSchema,
  qrCodeScan: qrCodeScanSchema,
  refreshToken: refreshTokenSchema,
  magicLinkUserRegistration: magicLinkUserRegistrationSchema,
  userLogin: userLoginSchema,
  userRegistration: userRegistrationSchema,
  
  // User
  userUpdate: userUpdateSchema,
  userSearch: userSearchSchema,
  
  // Chat
  createChat: createChatSchema,
  updateChat: updateChatSchema,
  chatSearch: chatSearchSchema,
  
  // Message
  sendMessage: sendMessageSchema,
  messageReaction: messageReactionSchema,
  forwardMessage: forwardMessageSchema,
  deleteMessage: deleteMessageSchema,
  editMessage: editMessageSchema,
  messageSearch: messageSearchSchema,
  markMultipleAsRead: markMultipleAsReadSchema,
  
  // File Upload
  fileUpload: fileUploadSchema,
  imageUpload: imageUploadSchema,
  videoUpload: videoUploadSchema,
  audioUpload: audioUploadSchema,
  documentUpload: documentUploadSchema,
  voiceMessage: voiceMessageSchema,
  
  // UI Forms
  contactForm: contactFormSchema,
  locationMessage: locationMessageSchema,
  
  // Settings
  userPreferences: userPreferencesSchema,
  notificationSettings: notificationSettingsSchema,
  privacySettings: privacySettingsSchema,
  chatSettings: chatSettingsSchema,
  
  // Pagination
  pagination: paginationSchema,
  messagePagination: messagePaginationSchema,
  
  // Group Management
  addParticipants: addParticipantsSchema,
  removeParticipant: removeParticipantSchema,
  makeAdmin: makeAdminSchema,
  groupSettings: groupSettingsSchema,
  
  // WebSocket
  wsMessage: wsMessageSchema,
  typingPayload: typingPayloadSchema,
};

export default schemas;