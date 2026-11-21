public class Hello {
    public static void main(String[] args) {
        String name = args.length > 0 ? args[0] : "Brewline";
        System.out.println("Hello, " + name + " from Java " + Runtime.version().feature());
    }
}
