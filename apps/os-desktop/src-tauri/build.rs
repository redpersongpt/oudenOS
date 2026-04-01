fn main() {
    // Embed a Windows application manifest that requests "highestAvailable"
    // execution level. This matches the Electron build's
    // requestedExecutionLevel: "highestAvailable" setting.
    //
    // Effect: when the user has admin rights, the app runs elevated.
    // When they don't, it runs as a standard user without a UAC prompt.
    // The privileged Rust service inherits the elevation token.
    let windows = tauri_build::WindowsAttributes::new().app_manifest(
        r#"<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <dependency>
    <dependentAssembly>
      <assemblyIdentity
        type="win32"
        name="Microsoft.Windows.Common-Controls"
        version="6.0.0.0"
        processorArchitecture="*"
        publicKeyToken="6595b64144ccf1df"
        language="*"
      />
    </dependentAssembly>
  </dependency>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security>
      <requestedPrivileges>
        <requestedExecutionLevel level="highestAvailable" uiAccess="false" />
      </requestedPrivileges>
    </security>
  </trustInfo>
</assembly>"#,
    );

    tauri_build::try_build(
        tauri_build::Attributes::new().windows_attributes(windows),
    )
    .expect("failed to run tauri build script");
}
