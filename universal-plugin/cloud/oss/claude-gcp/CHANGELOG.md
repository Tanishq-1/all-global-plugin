# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - Unreleased

### Added
- Cloud Run skill with deploy patterns, scaling, and troubleshooting references
- Cloud Build skill with triggers, build configs, and artifacts references
- IAM skill with least-privilege, service accounts, and workload identity references
- Secret Manager skill with rotation and access pattern references
- Deploy Agent for full build-push-deploy orchestration
- Pre-deploy check hook (Dockerfile validation, SA permissions, secret audit)
- Post-deploy verify hook (health check, traffic verification, error monitoring)
- `/gcp-deploy` slash command — interactive deploy wizard
- `/gcp-status` slash command — service health dashboard
- Cloud Run + FastAPI starter template
- GitHub Actions + Workload Identity Federation starter template
- Plugin manifest, CLAUDE.md, README, and contributing guide
