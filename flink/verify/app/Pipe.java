package brewline;

import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.functions.RichMapFunction;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.sink.v2.DiscardingSink;
import org.apache.flink.util.ParameterTool;

/** A source that can read much faster than the step after it: the step after it takes some milliseconds for every record, like a call to a slow service. */
public class Pipe {
    public static void main(String[] args) throws Exception {
        ParameterTool p = ParameterTool.fromArgs(args);
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        KafkaSource<String> source = KafkaSource.<String>builder()
                .setBootstrapServers(p.getRequired("bootstrap"))
                .setTopics(p.getRequired("topic"))
                .setGroupId("pipe")
                .setStartingOffsets(OffsetsInitializer.earliest())
                .setValueOnlyDeserializer(new SimpleStringSchema())
                .build();

        long sleepMillis = p.getLong("sleep-ms", 10);
        env.fromSource(source, WatermarkStrategy.noWatermarks(), "orders").setParallelism(1)
                .rebalance()                                                  // a network step between the source and the slow step, so that they are two tasks
                .map(new RichMapFunction<String, String>() {
                    @Override
                    public String map(String value) throws Exception {
                        Thread.sleep(sleepMillis);
                        return value;
                    }
                }).name("slow lookup").setParallelism(p.getInt("lookup-parallelism", 1))
                .sinkTo(new DiscardingSink<>()).name("discard");

        env.execute("pipe");
    }
}
