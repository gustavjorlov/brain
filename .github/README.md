# GitHub Actions Workflows

This directory contains automated workflows for the Brain CLI project,
implementing comprehensive CI/CD practices.

## Workflows Overview

### 1. Release Workflow (`release.yml`)

**Triggers:**

- Push to version tags (e.g., `v1.2.3`, `v1.2.3-beta.1`)
- Manual dispatch with version input

**Features:**

- ✅ Version validation from `deno.json` and tags
- ✅ Cross-platform binary builds (Linux, macOS Intel/ARM, Windows)
- ✅ Automated testing before release
- ✅ GitHub release creation with release notes
- ✅ Binary asset uploads with checksums
- ✅ Installation script generation
- ✅ Prerelease detection and handling

**Build Targets:**

- `x86_64-unknown-linux-gnu` → `brain-linux`
- `x86_64-apple-darwin` → `brain-mac`
- `aarch64-apple-darwin` → `brain-mac-arm64`
- `x86_64-pc-windows-msvc` → `brain.exe`

### 2. Continuous Integration (`ci.yml`)

**Triggers:**

- Push to `main` and `develop` branches
- Pull requests to `main` and `develop`

**Features:**

- ✅ Multi-platform testing (Ubuntu, macOS, Windows)
- ✅ Code formatting checks (`deno fmt`)
- ✅ Linting (`deno lint`)
- ✅ Type checking (`deno check`)
- ✅ Test execution with JUnit reporting
- ✅ Binary build verification
- ✅ Security vulnerability scanning
- ✅ Dependency caching for performance

### 3. Version Bump Workflow (`version-bump.yml`)

**Trigger:**

- Manual dispatch with version type selection

**Features:**

- ✅ Automated semantic versioning
- ✅ Support for major, minor, patch, and prerelease bumps
- ✅ Automatic `deno.json` updates
- ✅ Git tag creation and push
- ✅ Triggers release workflow automatically

**Version Types:**

- `patch`: 1.2.3 → 1.2.4
- `minor`: 1.2.3 → 1.3.0
- `major`: 1.2.3 → 2.0.0
- `prerelease`: 1.2.3 → 1.2.4-beta.0

### 4. Dependabot Configuration (`dependabot.yml`)

**Features:**

- ✅ Weekly GitHub Actions dependency updates
- ✅ Weekly Deno dependency monitoring
- ✅ Automatic PR creation with proper commit messages
- ✅ Reviewer and assignee configuration

## Usage Guide

### Creating a Release

#### Method 1: Tag-based Release (Recommended)

1. Update the version in `deno.json`:
   ```json
   {
     "version": "1.2.3"
   }
   ```

2. Create and push a version tag:
   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```

3. The release workflow will automatically:
   - Validate the version format
   - Run tests across all platforms
   - Build cross-platform binaries
   - Create a GitHub release with assets

#### Method 2: Version Bump Workflow

1. Go to GitHub Actions → Version Bump → Run workflow
2. Select the version bump type (patch/minor/major/prerelease)
3. The workflow will:
   - Update `deno.json`
   - Create a commit and tag
   - Trigger the release workflow automatically

#### Method 3: Manual Release

1. Go to GitHub Actions → Release → Run workflow
2. Enter the version (e.g., `v1.2.3`)
3. The workflow will create a release with that version

### Prerelease Support

The workflows fully support prerelease versions:

- `v1.2.3-beta.1` - Beta prerelease
- `v1.2.3-alpha.2` - Alpha prerelease
- `v1.2.3-rc.1` - Release candidate

Prereleases are automatically marked as "prerelease" in GitHub releases.

### Security Features

- **Dependency Scanning**: Trivy scanner checks for vulnerabilities
- **Permission Management**: Workflows use minimal required permissions
- **Token Security**: Uses built-in `GITHUB_TOKEN` with restricted scope
- **Artifact Security**: Checksums provided for all release binaries

### Performance Optimizations

- **Dependency Caching**: Deno dependencies cached across workflow runs
- **Parallel Builds**: Cross-platform builds run in parallel
- **Fail-Fast Strategy**: Disabled to ensure all platforms build even if one
  fails
- **Artifact Cleanup**: Build artifacts automatically cleaned up after 7 days

## Customization

### Modifying Build Targets

To add or modify build targets, update the matrix in `release.yml`:

```yaml
matrix:
  include:
    - os: ubuntu-latest
      target: your-new-target
      artifact: your-artifact-name
```

### Updating Release Notes Template

Modify the release notes generation in `release.yml` under the "Generate release
notes" step.

### Adding New Workflows

1. Create a new `.yml` file in `.github/workflows/`
2. Follow GitHub Actions best practices:
   - Use specific action versions (not `@latest`)
   - Implement proper error handling
   - Use minimal permissions
   - Cache dependencies when possible

## Troubleshooting

### Common Issues

**Build Failures:**

- Check Deno compatibility with target platforms
- Verify all dependencies are available for cross-compilation

**Version Conflicts:**

- Ensure `deno.json` version matches git tags
- Use the version bump workflow to maintain consistency

**Permission Errors:**

- Verify repository settings allow GitHub Actions
- Check that `GITHUB_TOKEN` has necessary permissions

### Debugging Workflows

1. Check the Actions tab in your GitHub repository
2. Review workflow run logs for detailed error messages
3. Use the workflow dispatch feature to test with different parameters
4. Enable debug logging by setting secrets:
   - `ACTIONS_RUNNER_DEBUG: true`
   - `ACTIONS_STEP_DEBUG: true`

## Best Practices Implemented

✅ **Security**: Minimal permissions, dependency scanning, secure token usage ✅
**Performance**: Caching, parallel execution, optimized artifact handling\
✅ **Reliability**: Comprehensive testing, error handling, rollback capabilities
✅ **Maintainability**: Clear documentation, consistent naming, modular design
✅ **Automation**: Minimal manual intervention, automated version management ✅
**Monitoring**: Test reporting, security alerts, dependency updates
