from setuptools import setup, find_packages

with open("requirements.txt") as f:
	install_requires = [line.strip() for line in f if line.strip() and not line.startswith("#")]

from inmark_app import __version__ as version

setup(
	name="inmark_app",
	version=version,
	description="Custom app for Inmark Exports",
	author="Inmark Exports",
	author_email="varun@inmark.co.in",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
