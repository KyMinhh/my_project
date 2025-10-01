import { io, Socket } from 'socket.io-client';

interface SocketEvents {
  // Collaboration events
  'join-transcript': (data: { transcriptId: string; userId: string }) => void;
  'leave-transcript': (data: { transcriptId: string; userId: string }) => void;
  'text-operation': (data: { transcriptId: string; operation: any }) => void;
  'cursor-position': (data: { transcriptId: string; userId: string; position: number; selection?: any }) => void;
  'typing-status': (data: { transcriptId: string; userId: string; isTyping: boolean }) => void;
  'save-transcript': (data: { transcriptId: string; content: string; userId: string }) => void;
  
  // Comment events
  'add-comment': (data: { transcriptId: string; comment: any }) => void;
  'update-comment': (data: { transcriptId: string; commentId: string; updates: any }) => void;
  'delete-comment': (data: { transcriptId: string; commentId: string }) => void;
  'resolve-comment': (data: { transcriptId: string; commentId: string }) => void;
  'react-comment': (data: { transcriptId: string; commentId: string; reaction: string }) => void;
}

interface SocketListeners {
  // Collaboration listeners
  'text-operation': (data: { operation: any }) => void;
  'cursor-position': (data: { userId: string; position: number; selection?: any }) => void;
  'typing-status': (data: { userId: string; isTyping: boolean }) => void;
  'save-confirm': (data: { success: boolean; timestamp: string }) => void;
  'collaborators-update': (data: { collaborators: string[] }) => void;
  'presence-update': (data: { users: any[] }) => void;
  
  // Comment listeners
  'comment-added': (data: { comment: any }) => void;
  'comment-updated': (data: { commentId: string; updates: any }) => void;
  'comment-deleted': (data: { commentId: string }) => void;
  'comment-resolved': (data: { commentId: string }) => void;
  'comment-reaction': (data: { commentId: string; reaction: string; userId: string }) => void;
  
  // Connection events
  'connect': () => void;
  'disconnect': () => void;
  'error': (error: any) => void;
}

class CollaborationSocketService {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  constructor() {
    this.connect();
  }

  private connect(): void {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      // Get the server URL from environment or use default
      const serverUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';
      
      this.socket = io(serverUrl, {
        auth: {
          token: localStorage.getItem('authToken')
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5
      });

      // Connection event handlers
      this.socket.on('connect', () => {
        console.log('✅ Connected to collaboration server');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from collaboration server:', reason);
        this.isConnecting = false;
        
        // Auto-reconnect for certain disconnect reasons
        if (reason === 'io server disconnect') {
          // Server initiated disconnect - don't reconnect automatically
          console.log('Server disconnected the client');
        } else {
          // Client-side disconnect - attempt to reconnect
          this.handleReconnect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        this.isConnecting = false;
        this.handleReconnect();
      });

      this.socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
      });

      // Authentication error
      this.socket.on('auth-error', (error) => {
        console.error('❌ Authentication error:', error);
        this.disconnect();
        // Redirect to login or refresh token
        window.location.href = '/login';
      });

    } catch (error) {
      console.error('❌ Failed to create socket connection:', error);
      this.isConnecting = false;
      this.handleReconnect();
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Connection status
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  // Collaboration methods
  public joinTranscript(transcriptId: string, userId: string): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Socket not connected - cannot join transcript');
      return;
    }

    this.socket.emit('join-transcript', { transcriptId, userId });
  }

  public leaveTranscript(transcriptId: string, userId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('leave-transcript', { transcriptId, userId });
  }

  public sendTextOperation(transcriptId: string, operation: any): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Socket not connected - operation will be lost');
      return;
    }

    this.socket.emit('text-operation', { transcriptId, operation });
  }

  public sendCursorPosition(transcriptId: string, userId: string, position: number, selection?: any): void {
    if (!this.socket?.connected) return;

    this.socket.emit('cursor-position', { transcriptId, userId, position, selection });
  }

  public sendTypingStatus(transcriptId: string, userId: string, isTyping: boolean): void {
    if (!this.socket?.connected) return;

    this.socket.emit('typing-status', { transcriptId, userId, isTyping });
  }

  public saveTranscript(transcriptId: string, content: string, userId: string): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Socket not connected - save operation will be lost');
      return;
    }

    this.socket.emit('save-transcript', { transcriptId, content, userId });
  }

  // Comment methods
  public addComment(transcriptId: string, comment: any): void {
    if (!this.socket?.connected) return;

    this.socket.emit('add-comment', { transcriptId, comment });
  }

  public updateComment(transcriptId: string, commentId: string, updates: any): void {
    if (!this.socket?.connected) return;

    this.socket.emit('update-comment', { transcriptId, commentId, updates });
  }

  public deleteComment(transcriptId: string, commentId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('delete-comment', { transcriptId, commentId });
  }

  public resolveComment(transcriptId: string, commentId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('resolve-comment', { transcriptId, commentId });
  }

  public reactToComment(transcriptId: string, commentId: string, reaction: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('react-comment', { transcriptId, commentId, reaction });
  }

  // Event listeners
  public on<K extends keyof SocketListeners>(event: K, callback: SocketListeners[K]): void {
    if (!this.socket) {
      console.warn(`⚠️ Cannot register listener for ${event} - socket not initialized`);
      return;
    }

    this.socket.on(event, callback);
  }

  public off<K extends keyof SocketListeners>(event: K, callback?: SocketListeners[K]): void {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }

  // Cleanup
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  // Update authentication token
  public updateAuth(token: string): void {
    if (this.socket) {
      this.socket.auth = { token };
      
      // Reconnect with new token if connected
      if (this.socket.connected) {
        this.socket.disconnect();
        this.connect();
      }
    }
  }

  // Get connection statistics
  public getConnectionStats(): {
    connected: boolean;
    reconnectAttempts: number;
    transport: string | undefined;
    id: string | undefined;
  } {
    return {
      connected: this.socket?.connected || false,
      reconnectAttempts: this.reconnectAttempts,
      transport: this.socket?.io.engine?.transport?.name,
      id: this.socket?.id
    };
  }
}

// Singleton instance
const collaborationSocket = new CollaborationSocketService();

export default collaborationSocket;

// Named exports for convenience
export {
  type SocketEvents,
  type SocketListeners,
  CollaborationSocketService
};
