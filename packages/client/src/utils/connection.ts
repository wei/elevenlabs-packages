import {
  InitiationClientDataEvent,
  ConfigEvent,
  isValidSocketEvent,
  OutgoingSocketEvent,
} from "./events";

const MAIN_PROTOCOL = "convai";

export type Language =
  | "en"
  | "ja"
  | "zh"
  | "de"
  | "hi"
  | "fr"
  | "ko"
  | "pt"
  | "it"
  | "es"
  | "id"
  | "nl"
  | "tr"
  | "pl"
  | "sv"
  | "bg"
  | "ro"
  | "ar"
  | "cs"
  | "el"
  | "fi"
  | "ms"
  | "da"
  | "ta"
  | "uk"
  | "ru"
  | "hu"
  | "no"
  | "vi";
export type SessionConfig = {
  origin?: string;
  authorization?: string;
  overrides?: {
    agent?: {
      prompt?: {
        prompt?: string;
      };
      firstMessage?: string;
      language?: Language;
    };
    tts?: {
      voiceId?: string;
    };
  };
  customLlmExtraBody?: any;
} & (
  | { signedUrl: string; agentId?: undefined }
  | { agentId: string; signedUrl?: undefined }
);

const WSS_API_ORIGIN = "wss://api.elevenlabs.io";
const WSS_API_PATHNAME = "/v1/convai/conversation?agent_id=";

export class Connection {
  public static async create(config: SessionConfig): Promise<Connection> {
    let socket: WebSocket | null = null;

    try {
      const origin = config.origin ?? WSS_API_ORIGIN;
      const url = config.signedUrl
        ? config.signedUrl
        : origin + WSS_API_PATHNAME + config.agentId;

      const protocols = [MAIN_PROTOCOL];
      if (config.authorization) {
        protocols.push(`bearer.${config.authorization}`);
      }
      socket = new WebSocket(url, protocols);
      const conversationConfig = await new Promise<
        ConfigEvent["conversation_initiation_metadata_event"]
      >((resolve, reject) => {
        socket!.addEventListener(
          "open",
          () => {
            const overridesEvent: InitiationClientDataEvent = {
              type: "conversation_initiation_client_data",
            };

            if (config.overrides) {
              overridesEvent.conversation_config_override = {
                agent: {
                  prompt: config.overrides.agent?.prompt,
                  first_message: config.overrides.agent?.firstMessage,
                  language: config.overrides.agent?.language,
                },
                tts: {
                  voice_id: config.overrides.tts?.voiceId,
                },
              };
            }

            if (config.customLlmExtraBody) {
              overridesEvent.custom_llm_extra_body = config.customLlmExtraBody;
            }

            socket?.send(JSON.stringify(overridesEvent));
          },
          { once: true }
        );
        socket!.addEventListener("error", reject);
        socket!.addEventListener("close", reject);
        socket!.addEventListener(
          "message",
          (event: MessageEvent) => {
            const message = JSON.parse(event.data);

            if (!isValidSocketEvent(message)) {
              return;
            }

            if (message.type === "conversation_initiation_metadata") {
              resolve(message.conversation_initiation_metadata_event);
            } else {
              console.warn(
                "First received message is not conversation metadata."
              );
            }
          },
          { once: true }
        );
      });

      const conversationId = conversationConfig.conversation_id;
      const sampleRate = parseInt(
        conversationConfig.agent_output_audio_format.replace("pcm_", "")
      );

      return new Connection(socket, conversationId, sampleRate);
    } catch (error) {
      socket?.close();
      throw error;
    }
  }

  private constructor(
    public readonly socket: WebSocket,
    public readonly conversationId: string,
    public readonly sampleRate: number
  ) {}

  public close() {
    this.socket.close();
  }

  public sendMessage(message: OutgoingSocketEvent) {
    this.socket.send(JSON.stringify(message));
  }
}
