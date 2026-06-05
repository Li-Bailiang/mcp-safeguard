import java.sql.*;
import javax.servlet.http.*;

public class VulnerableJavaCode {

    // SQL Injection vulnerabilities
    public void sqlInjectionConcat(Connection conn, String userId) throws SQLException {
        Statement stmt = conn.createStatement();
        // Vulnerable: String concatenation
        String query = "SELECT * FROM users WHERE id = '" + userId + "'";
        ResultSet rs = stmt.executeQuery(query);
    }

    public void sqlInjectionFormat(Connection conn, String username) throws SQLException {
        Statement stmt = conn.createStatement();
        // Vulnerable: String.format
        String query = String.format("SELECT * FROM users WHERE username = '%s'", username);
        ResultSet rs = stmt.executeQuery(query);
    }

    public void sqlInjectionPreparedConcat(Connection conn, String email) throws SQLException {
        // Vulnerable: PreparedStatement with concatenation
        String query = "SELECT * FROM users WHERE email = '" + email + "'";
        PreparedStatement pstmt = conn.prepareStatement(query);
        ResultSet rs = pstmt.executeQuery();
    }

    // Command Injection vulnerabilities
    public void commandInjectionRuntime(String userInput) throws Exception {
        // Vulnerable: Runtime.exec with concatenation
        Runtime.getRuntime().exec("ls -la " + userInput);
    }

    public void commandInjectionShell(String filename) throws Exception {
        // Vulnerable: Using shell
        Runtime.getRuntime().exec(new String[]{"sh", "-c", "cat " + filename});
    }

    public void commandInjectionFormat(String path) throws Exception {
        // Vulnerable: String.format
        String cmd = String.format("rm -rf %s", path);
        Runtime.getRuntime().exec(cmd);
    }

    // Path Traversal vulnerabilities
    public void pathTraversalFile(String userPath) {
        // Vulnerable: File with concatenation
        java.io.File file = new java.io.File("/var/data/" + userPath);
    }

    public void pathTraversalPaths(String filename) {
        // Vulnerable: Paths.get with concatenation
        java.nio.file.Path path = java.nio.file.Paths.get("/uploads/" + filename);
    }

    public void pathTraversalFileStream(String file) throws Exception {
        // Vulnerable: FileInputStream with concatenation
        java.io.FileInputStream fis = new java.io.FileInputStream("/tmp/" + file);
    }

    // Hardcoded Credentials
    private static final String DB_PASSWORD = "MySecretP@ssw0rd123";
    private static final String API_KEY = "EXAMPLE_API_KEY_DO_NOT_USE";
    private String apiToken = "Bearer abc123xyz789";

    public void hardcodedJdbcCredentials() throws SQLException {
        // Vulnerable: Hardcoded credentials
        Connection conn = DriverManager.getConnection(
            "jdbc:mysql://localhost:3306/mydb",
            "admin",
            "password123"
        );
    }

    // Weak Cryptography
    public void weakCipherDES() throws Exception {
        // Vulnerable: DES encryption
        javax.crypto.Cipher cipher = javax.crypto.Cipher.getInstance("DES");
    }

    public void weakHashMD5() throws Exception {
        // Vulnerable: MD5 hash
        java.security.MessageDigest md = java.security.MessageDigest.getInstance("MD5");
    }

    public void weakHashSHA1() throws Exception {
        // Vulnerable: SHA-1 hash
        java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-1");
    }

    public void weakCipherECB() throws Exception {
        // Vulnerable: ECB mode
        javax.crypto.Cipher cipher = javax.crypto.Cipher.getInstance("AES/ECB/PKCS5Padding");
    }

    public void insecureRandom() {
        // Vulnerable: Using Random instead of SecureRandom
        java.util.Random random = new java.util.Random();
        String sessionToken = String.valueOf(random.nextInt());
    }

    // LDAP Injection
    public void ldapInjectionSearch(javax.naming.directory.InitialDirContext ctx, String username) throws Exception {
        // Vulnerable: LDAP injection
        String filter = "(&(uid=" + username + ")(objectClass=person))";
        ctx.search("ou=users,dc=example,dc=com", filter, null);
    }

    public void ldapInjectionLookup(javax.naming.directory.InitialDirContext ctx, String dn) throws Exception {
        // Vulnerable: DN injection
        ctx.lookup("cn=" + dn + ",ou=users,dc=example,dc=com");
    }

    // Insecure Deserialization
    public Object insecureDeserialization(java.io.InputStream input) throws Exception {
        // Vulnerable: ObjectInputStream without validation
        java.io.ObjectInputStream ois = new java.io.ObjectInputStream(input);
        return ois.readObject();
    }

    public Object xmlDecoderDeserialization(java.io.InputStream input) {
        // Vulnerable: XMLDecoder
        java.beans.XMLDecoder decoder = new java.beans.XMLDecoder(input);
        return decoder.readObject();
    }

    // XXE Vulnerability
    public void xxeDocumentBuilder() throws Exception {
        // Vulnerable: DocumentBuilder without XXE protection
        javax.xml.parsers.DocumentBuilderFactory factory = javax.xml.parsers.DocumentBuilderFactory.newInstance();
        javax.xml.parsers.DocumentBuilder builder = factory.newDocumentBuilder();
    }

    public void xxeSAXParser() throws Exception {
        // Vulnerable: SAXParser without XXE protection
        javax.xml.parsers.SAXParserFactory factory = javax.xml.parsers.SAXParserFactory.newInstance();
        javax.xml.parsers.SAXParser parser = factory.newSAXParser();
    }

    // Trust Boundary Violations
    public void trustBoundarySession(HttpServletRequest request) {
        // Vulnerable: Storing untrusted data in session
        HttpSession session = request.getSession();
        session.setAttribute("userRole", request.getParameter("role"));
    }

    public void trustBoundarySystemProperty(HttpServletRequest request) {
        // Vulnerable: Setting system property from user input
        String config = request.getParameter("config");
        System.setProperty("app.config", config);
    }

    public void trustBoundaryLogging(HttpServletRequest request) {
        // Vulnerable: Log injection
        String username = request.getParameter("username");
        System.out.println("User logged in: " + username);
    }

    // Missing Authentication
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws Exception {
        // Vulnerable: No authentication check
        String data = getSecretData();
        resp.getWriter().write(data);
    }

    private String getSecretData() {
        return "Secret information";
    }
}
