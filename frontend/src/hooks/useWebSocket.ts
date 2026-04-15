import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:4000";

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect",    () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    return () => { socket.disconnect(); };
  }, []);

  function on<T>(event: string, handler: (data: T) => void) {
    useEffect(() => {
      const socket = socketRef.current;
      if (!socket) return;
      socket.on(event, handler);
      return () => { socket.off(event, handler); };
    }, [event, handler]);
  }

  return { socket: socketRef, connected, on };
}
