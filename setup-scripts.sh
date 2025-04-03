#!/bin/bash
# Symlink scripts to the root directory for easier access
ln -sf scripts/start-dev.sh start-dev.sh
ln -sf scripts/start-prod.sh start-prod.sh
chmod +x start-dev.sh
chmod +x start-prod.sh
