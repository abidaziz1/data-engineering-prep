import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

public class Race {
    static int plain = 0;
    static final AtomicInteger atomic = new AtomicInteger();

    public static void main(String[] args) throws Exception {
        int threads = 8, perThread = 100_000;
        List<Thread> all = new ArrayList<>();
        for (int t = 0; t < threads; t++) {
            Thread th = new Thread(() -> {
                for (int i = 0; i < perThread; i++) {
                    plain++;
                    atomic.incrementAndGet();
                }
            });
            all.add(th);
            th.start();
        }
        for (Thread th : all) {
            th.join();
        }
        System.out.println("expected " + threads * perThread + ", plain int " + (plain == threads * perThread ? "exact" : "short") + ", AtomicInteger " + atomic.get());

        try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
            List<Future<Long>> futures = new ArrayList<>();
            for (int n = 1; n <= 10; n++) {
                final long k = n;
                futures.add(pool.submit(() -> k * k));
            }
            long sum = 0;
            for (Future<Long> f : futures) {
                sum += f.get();
            }
            System.out.println("sum of squares from a pool of 4: " + sum);
        }

        AtomicInteger done = new AtomicInteger();
        try (ExecutorService virtual = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 1000; i++) {
                virtual.submit(() -> {
                    Thread.sleep(10);
                    done.incrementAndGet();
                    return null;
                });
            }
        }
        System.out.println("virtual threads that finished: " + done.get());
        Thread v = Thread.ofVirtual().start(() -> System.out.println("is virtual: " + Thread.currentThread().isVirtual()));
        v.join();
    }
}
