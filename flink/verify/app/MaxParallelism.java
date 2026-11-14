package brewline;

import org.apache.flink.runtime.state.KeyGroupRangeAssignment;

/** Asks Flink itself for the default maximum parallelism (the number of key groups) of an operator, and for the two bounds of that default. */
public class MaxParallelism {
    public static void main(String[] args) {
        System.out.println("parallelism,default_max_parallelism");
        for (String a : args) {
            int p = Integer.parseInt(a);
            System.out.println(p + "," + KeyGroupRangeAssignment.computeDefaultMaxParallelism(p));
        }
        System.out.println("lower_bound," + KeyGroupRangeAssignment.DEFAULT_LOWER_BOUND_MAX_PARALLELISM);
        System.out.println("upper_bound," + KeyGroupRangeAssignment.UPPER_BOUND_MAX_PARALLELISM);
    }
}
