import java.sql.*;
import javax.servlet.http.*;
import java.security.SecureRandom;
import javax.crypto.Cipher;

public class SafeJavaCode {

    // Safe SQL - Using PreparedStatement
    public void safeSqlQuery(Connection conn, String userId) throws SQLException {
        // Safe: PreparedStatement with parameters
        String query = "SELECT * FROM users WHERE id = ?";
        PreparedStatement pstmt = conn.prepareStatement(query);
        pstmt.setString(1, userId);
        ResultSet rs = pstmt.executeQuery();
    }

    public void safeSqlUpdate(Connection conn, String username, String email) throws SQLException {
        // Safe: PreparedStatement with multiple parameters
        String query = "UPDATE users SET email = ? WHERE username = ?";
        PreparedStatement pstmt = conn.prepareStatement(query);
        pstmt.setString(1, email);
        pstmt.setString(2, username);
        pstmt.executeUpdate();
    }

    // Safe Command Execution - Using ProcessBuilder
    public void safeCommandExecution(String filename) throws Exception {
        // Safe: ProcessBuilder with separate arguments
        ProcessBuilder pb = new ProcessBuilder("ls", "-la", filename);
        Process process = pb.start();
    }

    public void safeCommandValidation(String userInput) throws Exception {
        // Safe: Validation before execution
        if (userInput.matches("^[a-zA-Z0-9_-]+$")) {
            ProcessBuilder pb = new ProcessBuilder("cat", userInput);
            Process process = pb.start();
        } else {
            throw new IllegalArgumentException("Invalid input");
        }
    }

    // Safe Path Handling
    public void safePathHandling(String userPath) throws Exception {
        // Safe: Validate canonical path
        java.io.File baseDir = new java.io.File("/var/data");
        java.io.File userFile = new java.io.File(baseDir, userPath);
        String canonicalPath = userFile.getCanonicalPath();

        if (canonicalPath.startsWith(baseDir.getCanonicalPath())) {
            // Path is safe
            java.io.FileInputStream fis = new java.io.FileInputStream(userFile);
        } else {
            throw new SecurityException("Path traversal attempt detected");
        }
    }

    public void safePathValidation(String filename) throws Exception {
        // Safe: Whitelist validation
        if (!filename.contains("..") && filename.matches("^[a-zA-Z0-9._-]+$")) {
            java.nio.file.Path path = java.nio.file.Paths.get("/uploads", filename);
            java.nio.file.Files.readAllBytes(path);
        }
    }

    // Safe Credentials - Using environment variables
    public void safeCredentials() throws SQLException {
        // Safe: Load from environment
        String dbUrl = System.getenv("DB_URL");
        String dbUser = System.getenv("DB_USER");
        String dbPassword = System.getenv("DB_PASSWORD");

        Connection conn = DriverManager.getConnection(dbUrl, dbUser, dbPassword);
    }

    // Safe Cryptography
    public void strongCipherAES() throws Exception {
        // Safe: AES-GCM
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    }

    public void strongHashSHA256() throws Exception {
        // Safe: SHA-256
        java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
    }

    public void secureRandomGeneration() {
        // Safe: SecureRandom for security-sensitive operations
        SecureRandom secureRandom = new SecureRandom();
        byte[] token = new byte[32];
        secureRandom.nextBytes(token);
    }

    // Safe LDAP Queries
    public void safeLdapSearch(javax.naming.directory.InitialDirContext ctx, String username) throws Exception {
        // Safe: Escape LDAP special characters
        String escapedUsername = escapeLdap(username);
        String filter = "(&(uid=" + escapedUsername + ")(objectClass=person))";
        ctx.search("ou=users,dc=example,dc=com", filter, null);
    }

    private String escapeLdap(String input) {
        // Escape LDAP special characters
        return input.replace("\\", "\\\\")
                   .replace("*", "\\*")
                   .replace("(", "\\(")
                   .replace(")", "\\)")
                   .replace("\0", "\\00");
    }

    // Safe Deserialization
    public Object safeDeserialization(java.io.InputStream input) throws Exception {
        // Safe: Use ValidatingObjectInputStream or custom validation
        ValidatingObjectInputStream ois = new ValidatingObjectInputStream(input);
        ois.accept(AllowedClass.class, AnotherAllowedClass.class);
        return ois.readObject();
    }

    // Safe XML Parsing
    public void safeXmlParsing() throws Exception {
        // Safe: Disable XXE
        javax.xml.parsers.DocumentBuilderFactory factory = javax.xml.parsers.DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        javax.xml.parsers.DocumentBuilder builder = factory.newDocumentBuilder();
    }

    public void safeSAXParsing() throws Exception {
        // Safe: Disable XXE in SAXParser
        javax.xml.parsers.SAXParserFactory factory = javax.xml.parsers.SAXParserFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        javax.xml.parsers.SAXParser parser = factory.newSAXParser();
    }

    // Safe Trust Boundary Handling
    public void safeTrustBoundary(HttpServletRequest request) {
        // Safe: Validate before storing
        String role = request.getParameter("role");
        if (role != null && (role.equals("user") || role.equals("admin"))) {
            HttpSession session = request.getSession();
            session.setAttribute("userRole", role);
        }
    }

    public void safeLogging(HttpServletRequest request) {
        // Safe: Sanitize before logging
        String username = request.getParameter("username");
        String sanitized = username.replaceAll("[\r\n]", "");
        System.out.println("User logged in: " + sanitized);
    }

    // Safe Authentication
    @javax.annotation.security.RolesAllowed("admin")
    protected void doGetWithAuth(HttpServletRequest req, HttpServletResponse resp) throws Exception {
        // Safe: Protected with @RolesAllowed
        String data = getSecretData();
        resp.getWriter().write(data);
    }

    protected void doGetWithManualAuth(HttpServletRequest req, HttpServletResponse resp) throws Exception {
        // Safe: Manual authentication check
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            resp.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        String data = getSecretData();
        resp.getWriter().write(data);
    }

    private String getSecretData() {
        return "Secret information";
    }

    // Placeholder classes for deserialization example
    private static class ValidatingObjectInputStream extends java.io.ObjectInputStream {
        public ValidatingObjectInputStream(java.io.InputStream in) throws java.io.IOException {
            super(in);
        }

        public void accept(Class<?>... classes) {
            // Whitelist implementation
        }
    }

    private static class AllowedClass {}
    private static class AnotherAllowedClass {}
}
