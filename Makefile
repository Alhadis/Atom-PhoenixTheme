all: install tidy

install: node_modules/alhadis.utils
	command -v asar >/dev/null || npm -g i asar
	cd packages && $(MAKE)


# Delete useless crap
tidy:
	rm -f init.coffee
	rm -f npm-debug.log
	rm -f package-lock.json
	rm -f nohup.out
.PHONY: tidy


# Force Atom v1.25+ to use tabs when updating config.cson
cson-fix:
	@set -o errexit; \
	case `uname -s` in \
		Linux)  cd /usr/share/atom/resources;; \
		Darwin) cd "`which atom | xargs realpath | xargs dirname`/.." ;; \
		*)  printf 'No idea where Atom is on %s. Bailing\n' "`uname -s`"; exit 2;; \
	esac; \
	echo 'Unpacking app.asar'; \
	sudo asar extract app.asar app-patch; \
	cd ./app-patch/node_modules/season/lib; \
	echo 'Patching'; \
	sudo sed -i.ugh \
		-e 's|\(CSON\.stringify(object, visitor\), space|\1, "\\t"|g' \
		-e 's|\(JSON\.stringify(object, [^,]*\), [^)]*|\1, "\\t"|g' \
		cson.js && sudo rm -f cson.js.ugh && cd $$OLDPWD; \
	echo 'Packing updated files'; \
	sudo mv app.asar app-unpatched.asar && \
	sudo asar pack app-patch app.asar && \
	sudo rm -f app-unpatched.asar;


# Install/link dependencies
node_modules:
	[ -d "$@" ] || mkdir "$@";

node_modules/alhadis.utils: node_modules
	[ -e "$@" ] || { \
		[ -d ~/Labs/Utils/.git ] && ln -s ~/Labs/Utils $@ || \
		git clone 'git@github.com:Alhadis/Utils.git' $@; \
		cd $@ && $(MAKE); \
	};

node_modules/%: node_modules
	(npm install $* 2>&1) >/dev/null; true


# Regenerate list of installed packages
packages/Makefile:
	@pkglist=`apm list -bi --no-dev \
	| sed 's/@[^@]*$$//' \
	| grep -v 'biro-syntax' \
	| grep -v '^[[:blank:]]*$$' \
	| sort -df`; all=""; git=""; \
	cwd=$(PWD); \
	for i in $$pkglist; do \
		dir=~/.atom/packages/$$i/.git; \
		[ -d "$$dir" ] && { \
			cd "$$dir/.."; \
			url=`git remote get-url origin`; \
			git=`printf "%s%s:\n\tgit clone '%s' \\$$@\nZ" "$$git" "$$i" "$$url"`; \
			git=`printf '%s\tcd $$@ && apm install .\n\nZ' "$${git%Z}"`; \
			git="$${git%Z}"; \
		}; \
		all=`printf '%s%s\nZ' "$$all" "$$i"`; \
		all=$${all%Z}; \
	done; \
	cd $$cwd; (\
		printf 'all: \\\n'; \
		printf '%s\n' "$$all" | sed -e 's/^\(.\)/\t\1/; s/\([^[:blank:]]\)$$/\1 \\/'; \
		printf '\n%s' "$$git"; \
		printf '%%:; apm install $$*\n.PHONY: all\n'; \
	) > $@;
.PHONY: packages/Makefile
