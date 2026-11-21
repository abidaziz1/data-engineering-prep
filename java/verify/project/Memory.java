import java.io.BufferedReader;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

public class Memory {
    public static void main(String[] args) throws Exception {
        Path path = Path.of(args[1]);
        System.out.println("max heap: " + Runtime.getRuntime().maxMemory() / (1024 * 1024) + " MB");
        switch (args[0]) {
            case "all" -> {
                List<String> lines = Files.readAllLines(path);
                System.out.println(lines.size() + " lines read into a list");
            }
            case "stream" -> {
                try (Stream<String> lines = Files.lines(path)) {
                    System.out.println(lines.count() + " lines counted from a stream");
                }
            }
            case "sum" -> {
                long cents = 0;
                long rows = 0;
                try (BufferedReader in = Files.newBufferedReader(path)) {
                    in.readLine();                              // the header
                    for (String line = in.readLine(); line != null; line = in.readLine()) {
                        String[] parts = line.split(",");
                        cents += new BigDecimal(parts[5]).movePointRight(2).longValueExact();
                        rows++;
                    }
                }
                System.out.println(rows + " rows, " + cents + " cents");
            }
            default -> throw new IllegalArgumentException("mode: all, stream or sum");
        }
    }
}
