import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class Streams {
    record Line(String order, String sku, int qty, double price) {}

    public static void main(String[] args) {
        List<Line> lines = List.of(
            new Line("O-1", "BEANS-250", 2, 14.0),
            new Line("O-1", "FILTER", 1, 3.5),
            new Line("O-2", "BEANS-250", 5, 14.0),
            new Line("O-3", "MUG", 1, 9.0),
            new Line("O-3", "FILTER", 4, 3.5));

        Map<String, Double> revenue = lines.stream().collect(
            Collectors.groupingBy(Line::sku, TreeMap::new, Collectors.summingDouble(l -> l.qty() * l.price())));
        System.out.println(revenue);

        Stream.of("a", "b", "c")
            .peek(x -> System.out.println("peek " + x))
            .map(String::toUpperCase)
            .limit(2)
            .forEach(x -> System.out.println("got " + x));

        Stream<String> once = Stream.of("x");
        once.count();
        try {
            once.count();
        } catch (IllegalStateException e) {
            System.out.println("reuse: " + e.getMessage());
        }

        try {
            lines.stream().collect(Collectors.toMap(Line::sku, Line::qty));
        } catch (IllegalStateException e) {
            System.out.println("toMap: " + e.getMessage());
        }
        Map<String, Integer> qty = lines.stream().collect(Collectors.toMap(Line::sku, Line::qty, Integer::sum, TreeMap::new));
        System.out.println(qty);

        Map<Boolean, Long> bigOrSmall = lines.stream().collect(Collectors.partitioningBy(l -> l.qty() * l.price() >= 20, Collectors.counting()));
        System.out.println(bigOrSmall);
        System.out.println(lines.stream().map(Line::order).distinct().collect(Collectors.joining(", ")));
    }
}
