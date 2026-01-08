const { withPodfile } = require('@expo/config-plugins');

const withSQLiteConfig = config => {
  return withPodfile(config, config => {
    const podfile = config.modResults;

    // Add pre_install hook for static compilation
    const preInstallHook = `
# Force static compilation for OP-SQLite packages to prevent conflicts
pre_install do |installer|
  installer.pod_targets.each do |pod|
    if pod.name.eql?('op-sqlite') || pod.name.eql?('powersync-op-sqlite')
      def pod.build_type
        Pod::BuildType.static_library
      end
    end
  end
end`;

    // Insert pre_install hook after prepare_react_native_project! (only if not already present)
    if (
      podfile.contents.includes('prepare_react_native_project!') &&
      !podfile.contents.includes(
        '# Force static compilation for OP-SQLite packages to prevent conflicts'
      )
    ) {
      podfile.contents = podfile.contents.replace(
        'prepare_react_native_project!',
        `prepare_react_native_project!${preInstallHook}`
      );
    }

    // Add SQLite configuration to existing post_install hook
    const sqliteConfig = `
  # SQLite configuration to prevent conflicts
  installer.pods_project.targets.each do |target|
    if target.name == 'op-sqlite' || target.name == 'powersync-op-sqlite' || target.name == 'powersync-sqlite-core'

      target.build_configurations.each do |config|
        config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'YES'
        config.build_settings['DEFINES_MODULE'] = 'NO'
      end
      
      # Remove conflicting SQLite headers from public headers
      if target.name == 'op-sqlite'
        target.build_phases.each do |build_phase|
          if build_phase.is_a?(Xcodeproj::Project::Object::PBXHeadersBuildPhase)
            build_phase.files.each do |file|
              file_name = file.display_name || file.file_ref.display_name
              if file_name && (file_name.include?('sqlite3.h') || file_name.include?('libsql.h'))
                build_phase.remove_file_reference(file.file_ref)
                puts "Removed conflicting header #{file_name} from #{target.name}"
              end
            end
          end
        end
      end
    end
  end

  # Remove conflicting SQLite header symlinks from Headers directory
  require 'fileutils'
  op_sqlite_headers_dir = File.join(installer.sandbox.root, 'Headers', 'Public', 'op-sqlite')
  if Dir.exist?(op_sqlite_headers_dir)
    ['sqlite3.h', 'libsql.h'].each do |header_name|
      header_path = File.join(op_sqlite_headers_dir, header_name)
      if File.exist?(header_path)
        FileUtils.rm(header_path)
        puts "Removed conflicting header symlink #{header_name} from Headers directory"
      end
    end
  end`;

    // Find the post_install hook and add our configuration before the final end (only if not already present)
    const postInstallRegex = /post_install do \|installer\|([\s\S]*?)end$/m;
    if (
      postInstallRegex.test(podfile.contents) &&
      !podfile.contents.includes('# SQLite configuration to prevent conflicts')
    ) {
      podfile.contents = podfile.contents.replace(
        postInstallRegex,
        (match, content) => {
          // Add our SQLite configuration before the final end
          return `post_install do |installer|${content}${sqliteConfig}
end`;
        }
      );
    }

    return config;
  });
};

module.exports = withSQLiteConfig;
