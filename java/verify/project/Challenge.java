import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class Challenge {
    static long parseCents(String amount) {
        return new BigDecimal(amount).movePointRight(2).setScale(0, RoundingMode.UNNECESSARY).longValueExact();
    }

    static Map<Integer, Long> centsByStore(Stream<String> lines) {
        return lines.skip(1)
                .map(line -> line.split(","))
                .collect(Collectors.groupingBy(
                        p -> Integer.parseInt(p[1]),
                        TreeMap::new,
                        Collectors.summingLong(p -> parseCents(p[3]))));
    }

    public static void main(String[] args) {
        String header = "order_id,store_id,status,amount";
        System.out.println(centsByStore(Stream.of(header,
                "O-1,2,PLACED,12.50", "O-2,1,PLACED,5.00", "O-3,2,REFUNDED,3.25",
                "O-4,1,PLACED,0.99", "O-5,3,PLACED,100", "O-6,2,PLACED,7.10")));
        try {
            centsByStore(Stream.of(header, "O-9,1,PLACED,12.505"));
        } catch (ArithmeticException e) {
            System.out.println("refused: " + e.getMessage());
        }
    }
}
