import java.io.ByteArrayOutputStream;
import java.io.NotSerializableException;
import java.io.ObjectOutputStream;
import java.io.Serializable;

public class Ser {
    static class Connection {}

    record Task(String name, Connection connection) implements Serializable {}

    static class FixedTask implements Serializable {
        final String name;
        final transient Connection connection;      // not written, and null after reading

        FixedTask(String name, Connection connection) {
            this.name = name;
            this.connection = connection;
        }
    }

    public static void main(String[] args) throws Exception {
        try (ObjectOutputStream out = new ObjectOutputStream(new ByteArrayOutputStream())) {
            out.writeObject(new Task("load", new Connection()));
        } catch (NotSerializableException e) {
            System.out.println("failed: " + e);
        }
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(bytes)) {
            out.writeObject(new FixedTask("load", new Connection()));
        }
        System.out.println("transient field: serialized " + (bytes.size() > 0 ? "fine" : "nothing"));
    }
}
