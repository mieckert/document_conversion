import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import * as avro from 'avsc';

/**
 * Salesforce Pub/Sub API Client
 * Handles gRPC connection and event subscription/publishing
 */
export class PubSubClient {
  private client: any;
  private accessToken: string;
  private instanceUrl: string;
  private orgId: string;
  private endpoint: string;
  private schemas: Map<string, avro.Type> = new Map();

  constructor(accessToken: string, instanceUrl: string, orgId: string, endpoint: string) {
    this.accessToken = accessToken;
    this.instanceUrl = instanceUrl;
    this.orgId = orgId;
    this.endpoint = endpoint;
  }

  /**
   * Connect to Salesforce Pub/Sub API
   */
  async connect(): Promise<void> {
    try {
      console.log('[PubSub] Connecting to Pub/Sub API...');

      // Load proto file
      const protoPath = path.join(__dirname, '../../pubsub_api.proto');
      const packageDefinition = protoLoader.loadSync(protoPath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
      const PubSub = protoDescriptor.eventbus.v1.PubSub;

      // Create SSL credentials
      const credentials = grpc.credentials.createSsl();

      // Create client
      this.client = new PubSub(this.endpoint, credentials);

      console.log('[PubSub] Connected to:', this.endpoint);
    } catch (error: any) {
      console.error('[PubSub] Connection failed:', error.message);
      throw new Error(`Failed to connect to Pub/Sub API: ${error.message}`);
    }
  }

  /**
   * Get schema for a topic
   */
  async getSchema(topicName: string): Promise<avro.Type> {
    // Check cache
    if (this.schemas.has(topicName)) {
      return this.schemas.get(topicName)!;
    }

    return new Promise((resolve, reject) => {
      console.log(`[PubSub] Getting schema for topic: ${topicName}`);

      const metadata = new grpc.Metadata();
      metadata.add('accesstoken', this.accessToken);
      metadata.add('instanceurl', this.instanceUrl);
      metadata.add('tenantid', this.orgId);

      // First, get the topic info to retrieve schema_id
      this.client.GetTopic(
        { topic_name: topicName },
        metadata,
        (error: any, topicResponse: any) => {
          if (error) {
            console.error('[PubSub] GetTopic failed:', error.message);
            reject(new Error(`Failed to get topic info: ${error.message}`));
            return;
          }

          const schemaId = topicResponse.schema_id;
          if (!schemaId) {
            reject(new Error('Schema ID not found in topic response'));
            return;
          }

          console.log(`[PubSub] Schema ID: ${schemaId}`);

          // Now get the actual schema using GetSchema
          this.client.GetSchema(
            { schema_id: schemaId },
            metadata,
            (schemaError: any, schemaResponse: any) => {
              if (schemaError) {
                console.error('[PubSub] GetSchema failed:', schemaError.message);
                reject(new Error(`Failed to get schema: ${schemaError.message}`));
                return;
              }

              try {
                const schemaJson = JSON.parse(schemaResponse.schema_json);
                const schema = avro.Type.forSchema(schemaJson);

                // Cache schema
                this.schemas.set(topicName, schema);

                console.log(`[PubSub] Schema retrieved for: ${topicName}`);
                resolve(schema);
              } catch (parseError: any) {
                reject(new Error(`Failed to parse schema: ${parseError.message}`));
              }
            }
          );
        }
      );
    });
  }

  /**
   * Subscribe to a topic
   */
  async subscribe(
    topicName: string,
    replayPreset: number,
    onEvent: (event: any) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      console.log(`[PubSub] Subscribing to topic: ${topicName}`);

      // Get schema first
      const schema = await this.getSchema(topicName);

      const metadata = new grpc.Metadata();
      metadata.add('accesstoken', this.accessToken);
      metadata.add('instanceurl', this.instanceUrl);
      metadata.add('tenantid', this.orgId);

      const call = this.client.Subscribe(metadata);

      call.on('data', (response: any) => {
        if (response.events && response.events.length > 0) {
          response.events.forEach((event: any) => {
            try {
              // Decode Avro payload
              const decodedEvent = schema.fromBuffer(event.event.payload);
              console.log('[PubSub] Event received:', JSON.stringify(decodedEvent, null, 2));
              onEvent(decodedEvent);
            } catch (decodeError: any) {
              console.error('[PubSub] Failed to decode event:', decodeError.message);
              if (onError) onError(decodeError);
            }
          });

          // Send flow control to request more events
          call.write({
            topic_name: topicName,
            replay_preset: replayPreset,
            num_requested: 10,
          });
        }
      });

      call.on('error', (error: any) => {
        console.error('[PubSub] Subscription error:', error.message);
        if (onError) onError(error);
      });

      call.on('end', () => {
        console.log('[PubSub] Subscription ended');
      });

      // Initial subscription request
      const fetchRequest = {
        topic_name: topicName,
        replay_preset: replayPreset,
        num_requested: 10,
      };

      console.log('[PubSub] Sending FetchRequest:', JSON.stringify(fetchRequest, null, 2));
      call.write(fetchRequest);
      console.log('[PubSub] Subscription active');
    } catch (error: any) {
      console.error('[PubSub] Subscribe failed:', error.message);
      throw new Error(`Failed to subscribe: ${error.message}`);
    }
  }

  /**
   * Publish events to a topic
   */
  async publish(topicName: string, events: any[]): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(`[PubSub] Publishing ${events.length} event(s) to: ${topicName}`);

        // Get schema
        const schema = await this.getSchema(topicName);

        const metadata = new grpc.Metadata();
        metadata.add('accesstoken', this.accessToken);
        metadata.add('instanceurl', this.instanceUrl);
        metadata.add('tenantid', this.orgId);

        console.log('[PubSub] Schema type:', schema.typeName);
        console.log('[PubSub] Event to publish:', JSON.stringify(events[0], null, 2));

        // Encode events - add required system fields with defaults
        const encodedEvents = events.map(event => {
          // Add system fields that Avro schema expects
          const completeEvent = {
            CreatedDate: Date.now(),
            CreatedById: '',
            ...event,
          };

          console.log('[PubSub] Complete event:', JSON.stringify(completeEvent, null, 2));

          return {
            schema_id: this.schemas.get(topicName),
            payload: schema.toBuffer(completeEvent),
          };
        });

        this.client.Publish(
          {
            topic_name: topicName,
            events: encodedEvents,
          },
          metadata,
          (error: any, response: any) => {
            if (error) {
              console.error('[PubSub] Publish failed:', error.message);
              reject(new Error(`Failed to publish events: ${error.message}`));
              return;
            }

            console.log('[PubSub] Events published successfully');
            resolve();
          }
        );
      } catch (error: any) {
        console.error('[PubSub] Publish error:', error.message);
        reject(error);
      }
    });
  }

}
