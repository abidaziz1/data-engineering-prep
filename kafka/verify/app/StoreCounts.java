import java.time.Duration;
import java.util.Properties;

import org.apache.kafka.common.serialization.Serdes;
import org.apache.kafka.streams.KafkaStreams;
import org.apache.kafka.streams.KeyValue;
import org.apache.kafka.streams.StreamsBuilder;
import org.apache.kafka.streams.StreamsConfig;
import org.apache.kafka.streams.Topology;
import org.apache.kafka.streams.kstream.Materialized;
import org.apache.kafka.streams.kstream.Produced;
import org.apache.kafka.streams.kstream.TimeWindows;

/**
 * Counts orders as they arrive: per store and per minute of event time, and per sales channel.
 *
 * The first count is windowed: a window is one minute of event time, and it stays open for 30 more seconds for records that arrive late.
 * The second count needs a new key (the channel), so Kafka Streams moves the records through a repartition topic first.
 * Processing is exactly-once: the state, the output and the position in the input are committed together.
 */
public class StoreCounts {
    public static void main(String[] args) throws Exception {
        String bootstrap = args[0];
        String stateDir = args[1];

        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "store-counts");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrap);
        props.put(StreamsConfig.STATE_DIR_CONFIG, stateDir);
        props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.EXACTLY_ONCE_V2);
        props.put(StreamsConfig.COMMIT_INTERVAL_MS_CONFIG, 300);
        props.put(StreamsConfig.STATESTORE_CACHE_MAX_BYTES_CONFIG, 0);          // no cache: every update is sent on, so that the lesson can see every step
        props.put(StreamsConfig.NUM_STREAM_THREADS_CONFIG, 1);
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.StringSerde.class);
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.StringSerde.class);
        props.put(StreamsConfig.consumerPrefix("auto.offset.reset"), "earliest");

        StreamsBuilder builder = new StreamsBuilder();
        var orders = builder.<String, String>stream("orders-s");

        orders.groupByKey()
              .windowedBy(TimeWindows.ofSizeAndGrace(Duration.ofMinutes(1), Duration.ofSeconds(30)))
              .count(Materialized.as("orders-per-store-minute"))
              .toStream()
              .map((window, count) -> KeyValue.pair(window.key() + "@" + window.window().startTime(), Long.toString(count)))
              .to("order-counts");

        orders.selectKey((key, json) -> channelOf(json))
              .groupByKey()
              .count(Materialized.as("orders-per-channel"))
              .toStream()
              .to("channel-counts", Produced.with(Serdes.String(), Serdes.Long()));

        Topology topology = builder.build();
        System.out.println("TOPOLOGY-BEGIN");
        System.out.println(topology.describe());
        System.out.println("TOPOLOGY-END");

        KafkaStreams streams = new KafkaStreams(topology, props);
        Runtime.getRuntime().addShutdownHook(new Thread(streams::close));
        streams.setStateListener((now, before) -> System.out.println("STATE " + before + " -> " + now));
        streams.start();
        Thread reporter = new Thread(() -> {
            try {
                while (true) {
                    Thread.sleep(1000);
                    double dropped = 0;
                    for (var entry : streams.metrics().entrySet()) {
                        if (entry.getKey().name().equals("dropped-records-total") && entry.getKey().group().equals("stream-task-metrics")) {
                            dropped += ((Number) entry.getValue().metricValue()).doubleValue();       // one value for each task: add them up
                        }
                    }
                    System.out.println("METRIC dropped-records-total " + dropped);
                }
            } catch (InterruptedException e) {
                // the program is closing
            }
        });
        reporter.setDaemon(true);
        reporter.start();
        Thread.currentThread().join();
    }

    /** The sales channel of an order: the text between the quotes after "channel":. */
    static String channelOf(String json) {
        int start = json.indexOf("\"channel\":\"") + 11;
        return json.substring(start, json.indexOf('"', start));
    }
}
