import com.sun.source.util.JavacTask;
import java.io.File;
import java.net.URI;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

/** Parses each file that it is given with the parser of javac and prints "<file> OK" or "<file> <number of syntax errors> <first message>". Nothing is compiled or run. */
public class ParseCheck {
    public static void main(String[] args) throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        for (String name : args) {
            String source = Files.readString(new File(name).toPath());
            JavaFileObject unit = new SimpleJavaFileObject(URI.create("string:///" + new File(name).getName()), JavaFileObject.Kind.SOURCE) {
                @Override public CharSequence getCharContent(boolean ignore) { return source; }
            };
            var diagnostics = new DiagnosticCollector<JavaFileObject>();
            JavacTask task = (JavacTask) compiler.getTask(null, null, diagnostics, List.of("-proc:none"), null, List.of(unit));
            task.parse();
            List<String> errors = new ArrayList<>();
            for (Diagnostic<? extends JavaFileObject> d : diagnostics.getDiagnostics()) {
                if (d.getKind() == Diagnostic.Kind.ERROR) errors.add("line " + d.getLineNumber() + ": " + d.getMessage(null));
            }
            System.out.println(errors.isEmpty() ? name + " OK" : name + " " + errors.size() + " " + errors.get(0));
        }
    }
}
