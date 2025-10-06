use tauri_plugin_shell::ShellExt;
use std::{collections::HashMap};
use tauri::{async_runtime, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            println!("[Tauri] Initializing IPFS...");

            let app_handle = app.handle().clone();
            
            async_runtime::spawn(async move {
                // Get app data directory
                let app_data_dir = app_handle.path().app_data_dir().unwrap();
                let ipfs_path = app_data_dir.join(".ipfs");

                
                // Create environment variables
                let mut env = HashMap::new();
                env.insert("IPFS_PATH".to_string(), ipfs_path.to_string_lossy().to_string());
                println!("[Tauri] IPFS_PATH: {:?}", ipfs_path.to_string_lossy().to_string());

                let shell = app_handle.shell();

                let cors_commands = vec![
                    vec!["config", "API.HTTPHeaders.Access-Control-Allow-Origin", "[\"http://localhost:3000\", \"http://localhost:1420\", \"tauri://localhost\", \"https://webui.ipfs.io\", \"http://127.0.0.1:5001\"]", "--json"],
                    vec!["config", "API.HTTPHeaders.Access-Control-Allow-Methods", "[\"PUT\", \"POST\", \"GET\"]", "--json"],
                ];

                for cors_rule in cors_commands {
                    shell.sidecar("ipfs").unwrap().args(cors_rule).envs(env.clone()).output().await.unwrap();
                }

                    // Spawn IPFS daemon in offline mode
                    println!("[Tauri] Starting IPFS daemon in offline mode...");
                    let sidecar_command = shell.sidecar("ipfs").unwrap()
                        .args(["daemon", "--offline", "--init"])
                        .envs(env);

                    match sidecar_command.spawn() {
                        Ok(_) => println!("[Tauri] IPFS daemon spawned successfully!"),
                        Err(e) => println!("[Tauri] Failed to spawn IPFS daemon: {}", e),
                    }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
