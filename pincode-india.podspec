require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'pincode-india'
  s.version      = package['version']
  s.summary      = package['description']
  s.homepage     = package['homepage'] || 'https://github.com/technoxys/pincode-india'
  s.license      = package['license']
  s.authors      = { 'technoxys' => 'https://github.com/technoxys' }
  s.platforms    = { :ios => '13.0' }
  s.source       = { :git => package.dig('repository', 'url') || '', :tag => "v#{s.version}" }

  s.source_files = 'ios/**/*.{h,m,mm,swift}'

  s.dependency 'React-Core'

  # Required for Swift module support under both old and new architecture.
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_VERSION' => '5.0'
  }

  s.requires_arc = true
end
