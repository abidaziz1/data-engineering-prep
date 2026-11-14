package brewline;

import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.functions.OpenContext;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.util.ParameterTool;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.JsonNode;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.util.Collector;

/** Reads Brewline orders from Kafka, keeps a count and a total for every store, and says so when a store has had no order for a while. */
public class StoreWatch {

    /** One order. Flink treats a public class with public fields and an empty constructor as a POJO and gives it a fast serializer. */
    public static class Order {
        public String storeId;
        public int totalCents;

        public Order() {}
    }

    public static void main(String[] args) throws Exception {
        ParameterTool p = ParameterTool.fromArgs(args);
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.enableCheckpointing(3000);

        KafkaSource<String> source = KafkaSource.<String>builder()
                .setBootstrapServers(p.getRequired("bootstrap"))
                .setTopics(p.getRequired("topic"))
                .setGroupId("store-watch")
                .setStartingOffsets(OffsetsInitializer.earliest())
                .setValueOnlyDeserializer(new SimpleStringSchema())
                .build();

        env.fromSource(source, WatermarkStrategy.noWatermarks(), "orders").uid("orders-source")
                .map(StoreWatch::parse).name("parse").uid("parse")
                .keyBy(o -> o.storeId)
                .process(new Watch(p.getLong("idle-seconds", 5) * 1000)).name("watch per store").uid(p.get("uid", "watch"))
                .print().name("print");

        env.execute("store-watch");
    }

    static Order parse(String json) throws Exception {
        JsonNode n = new ObjectMapper().readTree(json);
        Order o = new Order();
        o.storeId = n.get("store_id").asText();
        o.totalCents = n.get("total_cents").asInt();
        return o;
    }

    /** The state of one store lives in three ValueStates: it is kept per key, checkpointed with the job, and restored after a failure. */
    static class Watch extends KeyedProcessFunction<String, Order, String> {
        private final long idleMillis;
        private transient ValueState<Long> orders;
        private transient ValueState<Long> cents;
        private transient ValueState<Long> alarm;

        Watch(long idleMillis) {
            this.idleMillis = idleMillis;
        }

        @Override
        public void open(OpenContext ctx) {
            orders = getRuntimeContext().getState(new ValueStateDescriptor<>("orders", Long.class));
            cents = getRuntimeContext().getState(new ValueStateDescriptor<>("cents", Long.class));
            alarm = getRuntimeContext().getState(new ValueStateDescriptor<>("alarm", Long.class));
        }

        @Override
        public void processElement(Order o, Context ctx, Collector<String> out) throws Exception {
            long n = (orders.value() == null ? 0 : orders.value()) + 1;
            long c = (cents.value() == null ? 0 : cents.value()) + o.totalCents;
            orders.update(n);
            cents.update(c);
            if (n == 1) {
                out.collect("first order of " + o.storeId + " seen by subtask " + getRuntimeContext().getTaskInfo().getIndexOfThisSubtask());
            }
            if (alarm.value() != null) {
                ctx.timerService().deleteProcessingTimeTimer(alarm.value());      // an order came: the old alarm is not needed
            }
            long next = ctx.timerService().currentProcessingTime() + idleMillis;
            ctx.timerService().registerProcessingTimeTimer(next);
            alarm.update(next);
        }

        @Override
        public void onTimer(long timestamp, OnTimerContext ctx, Collector<String> out) throws Exception {
            out.collect("idle " + ctx.getCurrentKey() + " orders=" + orders.value() + " cents=" + cents.value());
            alarm.clear();
        }
    }
}
