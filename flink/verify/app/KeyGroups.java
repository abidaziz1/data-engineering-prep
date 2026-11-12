package brewline;

import org.apache.flink.runtime.state.KeyGroupRangeAssignment;

/** Asks Flink itself which key group a key belongs to, and which parallel task of an operator holds that key group. */
public class KeyGroups {
    public static void main(String[] args) {
        int maxParallelism = Integer.parseInt(args[0]);
        System.out.println("key,key_group,p2,p3,p4");
        for (int i = 1; i < args.length; i++) {
            String key = args[i];
            System.out.println(key + "," + KeyGroupRangeAssignment.assignToKeyGroup(key, maxParallelism)
                    + "," + KeyGroupRangeAssignment.assignKeyToParallelOperator(key, maxParallelism, 2)
                    + "," + KeyGroupRangeAssignment.assignKeyToParallelOperator(key, maxParallelism, 3)
                    + "," + KeyGroupRangeAssignment.assignKeyToParallelOperator(key, maxParallelism, 4));
        }
    }
}
