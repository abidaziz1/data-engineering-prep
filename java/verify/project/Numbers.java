import java.math.BigDecimal;
import java.math.RoundingMode;

public class Numbers {
    public static void main(String[] args) {
        System.out.println(0.1 + 0.2);
        double d = 0;
        BigDecimal b = BigDecimal.ZERO;
        BigDecimal dime = new BigDecimal("0.10");
        for (int i = 0; i < 1_000_000; i++) {
            d += 0.10;
            b = b.add(dime);
        }
        System.out.println("double sum:     " + d);
        System.out.println("BigDecimal sum: " + b);
        System.out.println(new BigDecimal(0.1));
        System.out.println(Integer.MAX_VALUE + 1);
        try {
            Math.addExact(Integer.MAX_VALUE, 1);
        } catch (ArithmeticException e) {
            System.out.println("addExact: " + e.getMessage());
        }
        System.out.println(new BigDecimal("2.50").equals(new BigDecimal("2.5")) + " " + (new BigDecimal("2.50").compareTo(new BigDecimal("2.5")) == 0));
        try {
            new BigDecimal("10").divide(new BigDecimal("3"));
        } catch (ArithmeticException e) {
            System.out.println("divide: " + e.getMessage());
        }
        System.out.println(new BigDecimal("10").divide(new BigDecimal("3"), 2, RoundingMode.HALF_EVEN));
        System.out.println(new BigDecimal("2.345").setScale(2, RoundingMode.HALF_EVEN) + " " + new BigDecimal("2.355").setScale(2, RoundingMode.HALF_EVEN));
        long cents = new BigDecimal("19.99").movePointRight(2).longValueExact();
        System.out.println(cents * 3 + " cents");
    }
}
