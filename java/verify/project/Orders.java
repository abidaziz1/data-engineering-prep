import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

public class Orders {
    enum Status { PLACED, SHIPPED, REFUNDED }

    record Order(String id, int storeId, Status status, double amount) {
        Order {
            if (amount < 0) {
                throw new IllegalArgumentException("amount must not be negative: " + amount);
            }
        }
    }

    static String label(Status status) {
        return switch (status) {
            case PLACED -> "waiting";
            case SHIPPED -> "on its way";
            case REFUNDED -> "money back";
        };
    }

    static Optional<Order> find(List<Order> orders, String id) {
        return orders.stream().filter(o -> o.id().equals(id)).findFirst();
    }

    public static void main(String[] args) {
        List<Order> orders = List.of(
            new Order("O-1", 1, Status.PLACED, 12.5),
            new Order("O-2", 2, Status.SHIPPED, 40.0),
            new Order("O-3", 1, Status.REFUNDED, 7.25));
        System.out.println(orders.get(0));
        System.out.println(orders.get(0).equals(new Order("O-1", 1, Status.PLACED, 12.5)));
        System.out.println(label(Status.SHIPPED));
        System.out.println(find(orders, "O-2").map(Order::amount).orElse(-1.0));
        System.out.println(find(orders, "O-9").map(Order::amount).orElse(-1.0));
        try {
            orders.add(new Order("O-4", 3, Status.PLACED, 1.0));
        } catch (UnsupportedOperationException e) {
            System.out.println("add failed: " + e);
        }
        try {
            new Order("O-5", 3, Status.PLACED, -1.0);
        } catch (IllegalArgumentException e) {
            System.out.println("bad order: " + e.getMessage());
        }
        Map<String, Integer> byStore = new HashMap<>();
        for (Order o : orders) {
            byStore.merge("store " + o.storeId(), 1, Integer::sum);
        }
        System.out.println(new TreeMap<>(byStore));
        String header = """
            order_id,store_id
            O-1,1
            """;
        System.out.println(header.lines().count() + " lines in the text block");
    }
}
