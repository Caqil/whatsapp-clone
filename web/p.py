import os
from pathlib import Path

def create_directory_structure():
    # Define the project structure
    structure = {
        "whatsapp-web-clone": {
            "src": {
                "app": {
                    "(auth)": {
                        "login": {"page.tsx": ""},
                        "register": {"page.tsx": ""},
                        "verify": {"page.tsx": ""},
                        "layout.tsx": ""
                    },
                    "(main)": {
                        "chat": {
                            "[chatId]": {"page.tsx": ""},
                            "page.tsx": ""
                        },
                        "profile": {"page.tsx": ""},
                        "settings": {"page.tsx": ""},
                        "layout.tsx": ""
                    },
                    "api": {
                        "upload": {"route.ts": ""}
                    },
                    "globals.css": "",
                    "layout.tsx": "",
                    "loading.tsx": "",
                    "not-found.tsx": "",
                    "page.tsx": ""
                },
                "components": {
                    "ui": {
                        "avatar.tsx": "",
                        "button.tsx": "",
                        "card.tsx": "",
                        "dialog.tsx": "",
                        "form.tsx": "",
                        "input.tsx": "",
                        "label.tsx": "",
                        "scroll-area.tsx": "",
                        "separator.tsx": "",
                        "toast.tsx": "",
                        "toaster.tsx": "",
                        "tooltip.tsx": ""
                    },
                    "auth": {
                        "magic-link-form.tsx": "",
                        "qr-code-scanner.tsx": "",
                        "register-form.tsx": "",
                        "auth-guard.tsx": ""
                    },
                    "chat": {
                        "chat-list.tsx": "",
                        "chat-item.tsx": "",
                        "chat-header.tsx": "",
                        "message-list.tsx": "",
                        "message-item.tsx": "",
                        "message-input.tsx": "",
                        "typing-indicator.tsx": "",
                        "message-status.tsx": "",
                        "new-chat-dialog.tsx": ""
                    },
                    "media": {
                        "image-viewer.tsx": "",
                        "file-upload.tsx": "",
                        "voice-recorder.tsx": "",
                        "media-gallery.tsx": ""
                    },
                    "layout": {
                        "sidebar.tsx": "",
                        "header.tsx": "",
                        "mobile-nav.tsx": "",
                        "search-bar.tsx": ""
                    },
                    "common": {
                        "loading-spinner.tsx": "",
                        "error-boundary.tsx": "",
                        "theme-provider.tsx": "",
                        "socket-provider.tsx": ""
                    }
                },
                "lib": {
                    "utils.ts": "",
                    "auth.ts": "",
                    "api.ts": "",
                    "socket.ts": "",
                    "validation.ts": "",
                    "constants.ts": "",
                    "storage.ts": ""
                },
                "hooks": {
                    "use-auth.ts": "",
                    "use-socket.ts": "",
                    "use-chat.ts": "",
                    "use-messages.ts": "",
                    "use-toast.ts": "",
                    "use-media-query.ts": "",
                    "use-local-storage.ts": ""
                },
                "types": {
                    "auth.ts": "",
                    "chat.ts": "",
                    "message.ts": "",
                    "user.ts": "",
                    "api.ts": ""
                },
                "store": {
                    "auth-store.ts": "",
                    "chat-store.ts": "",
                    "message-store.ts": "",
                    "ui-store.ts": ""
                },
                "config": {
                    "env.ts": "",
                    "api-endpoints.ts": ""
                }
            },
            "public": {
                "icons": {
                    "whatsapp.svg": "",
                    "send.svg": "",
                    "attachment.svg": ""
                },
                "images": {
                    "default-avatar.png": "",
                    "qr-code-placeholder.png": "",
                    "whatsapp-bg.jpg": ""
                },
                "sounds": {
                    "notification.mp3": "",
                    "message-sent.mp3": ""
                },
                "favicon.ico": "",
                "manifest.json": ""
            },
            "next.config.js": "",
            "tailwind.config.js": "",
            "tsconfig.json": "",
            "components.json": "",
            ".env.local": "",
            ".env.example": "",
            ".gitignore": "",
            "README.md": "",
            "package.json": ""
        }
    }

    def create_structure(base_path, structure):
        for name, content in structure.items():
            path = Path(base_path) / name
            if isinstance(content, dict):
                # Create directory
                path.mkdir(parents=True, exist_ok=True)
                # Recursively create subdirectories and files
                create_structure(path, content)
            else:
                # Create file
                path.touch()

    # Create base directory
    base_dir = Path.cwd() / "whatsapp-web-clone"
    base_dir.mkdir(exist_ok=True)
    
    # Create the entire structure
    create_structure(base_dir, structure)
    print(f"Project structure created successfully at: {base_dir}")

if __name__ == "__main__":
    create_directory_structure()
