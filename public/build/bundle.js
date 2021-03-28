
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.22.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src\Fightstats.svelte generated by Svelte v3.22.2 */

    const file = "src\\Fightstats.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (49:37) 
    function create_if_block_13(ctx) {
    	let td;
    	let img;
    	let img_src_value;
    	let t;

    	const block = {
    		c: function create() {
    			td = element("td");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "/images/dicesixred.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "6");
    			attr_dev(img, "class", "svelte-gd96md");
    			add_location(img, file, 50, 20, 1555);
    			add_location(td, file, 49, 18, 1529);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, img);
    			append_dev(td, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_13.name,
    		type: "if",
    		source: "(49:37) ",
    		ctx
    	});

    	return block;
    }

    // (45:37) 
    function create_if_block_12(ctx) {
    	let td;
    	let img;
    	let img_src_value;
    	let t;

    	const block = {
    		c: function create() {
    			td = element("td");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "/images/dicefivered.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "5");
    			attr_dev(img, "class", "svelte-gd96md");
    			add_location(img, file, 46, 20, 1402);
    			add_location(td, file, 45, 18, 1376);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, img);
    			append_dev(td, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(45:37) ",
    		ctx
    	});

    	return block;
    }

    // (41:37) 
    function create_if_block_11(ctx) {
    	let td;
    	let img;
    	let img_src_value;
    	let t;

    	const block = {
    		c: function create() {
    			td = element("td");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "/images/dicefourred.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "4");
    			attr_dev(img, "class", "svelte-gd96md");
    			add_location(img, file, 42, 20, 1249);
    			add_location(td, file, 41, 18, 1223);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, img);
    			append_dev(td, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(41:37) ",
    		ctx
    	});

    	return block;
    }

    // (37:37) 
    function create_if_block_10(ctx) {
    	let td;
    	let img;
    	let img_src_value;
    	let t;

    	const block = {
    		c: function create() {
    			td = element("td");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "/images/dicethreered.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "3");
    			attr_dev(img, "class", "svelte-gd96md");
    			add_location(img, file, 38, 20, 1095);
    			add_location(td, file, 37, 18, 1069);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, img);
    			append_dev(td, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(37:37) ",
    		ctx
    	});

    	return block;
    }

    // (33:37) 
    function create_if_block_9(ctx) {
    	let td;
    	let img;
    	let img_src_value;
    	let t;

    	const block = {
    		c: function create() {
    			td = element("td");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "/images/dicetwored.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "2");
    			attr_dev(img, "class", "svelte-gd96md");
    			add_location(img, file, 34, 20, 943);
    			add_location(td, file, 33, 18, 917);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, img);
    			append_dev(td, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(33:37) ",
    		ctx
    	});

    	return block;
    }

    // (29:37) 
    function create_if_block_8(ctx) {
    	let td;
    	let img;
    	let img_src_value;
    	let t;

    	const block = {
    		c: function create() {
    			td = element("td");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "/images/diceonered.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "1");
    			attr_dev(img, "class", "svelte-gd96md");
    			add_location(img, file, 30, 20, 791);
    			add_location(td, file, 29, 18, 765);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, img);
    			append_dev(td, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(29:37) ",
    		ctx
    	});

    	return block;
    }

    // (25:16) {#if dice === -1}
    function create_if_block_7(ctx) {
    	let td;
    	let img;
    	let img_src_value;
    	let t;

    	const block = {
    		c: function create() {
    			td = element("td");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "/images/nodicered.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "X");
    			attr_dev(img, "class", "svelte-gd96md");
    			add_location(img, file, 26, 22, 638);
    			add_location(td, file, 25, 20, 610);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, img);
    			append_dev(td, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(25:16) {#if dice === -1}",
    		ctx
    	});

    	return block;
    }

    // (24:12) {#each fight.attackerdice as dice}
    function create_each_block_1(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*dice*/ ctx[1] === -1) return create_if_block_7;
    		if (/*dice*/ ctx[1] === 1) return create_if_block_8;
    		if (/*dice*/ ctx[1] === 2) return create_if_block_9;
    		if (/*dice*/ ctx[1] === 3) return create_if_block_10;
    		if (/*dice*/ ctx[1] === 4) return create_if_block_11;
    		if (/*dice*/ ctx[1] === 5) return create_if_block_12;
    		if (/*dice*/ ctx[1] === 6) return create_if_block_13;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) {
    				if_block.d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(24:12) {#each fight.attackerdice as dice}",
    		ctx
    	});

    	return block;
    }

    // (83:39) 
    function create_if_block_6(ctx) {
    	let td;
    	let img;
    	let img_src_value;
    	let t;

    	const block = {
    		c: function create() {
    			td = element("td");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "/images/dicesixblue.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "6");
    			attr_dev(img, "class", "svelte-gd96md");
    			add_location(img, file, 84, 22, 2857);
    			add_location(td, file, 83, 20, 2829);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, img);
    			append_dev(td, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(83:39) ",
    		ctx
    	});

    	return block;
    }

    // (79:39) 
    function create_if_block_5(ctx) {
    	let td;
    	let img;
    	let img_src_value;
    	let t;

    	const block = {
    		c: function create() {
    			td = element("td");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "/images/dicefiveblue.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "5");
    			attr_dev(img, "class", "svelte-gd96md");
    			add_location(img, file, 80, 22, 2695);
    			add_location(td, file, 79, 20, 2667);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, img);
    			append_dev(td, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(79:39) ",
    		ctx
    	});

    	return block;
    }

    // (75:39) 
    function create_if_block_4(ctx) {
    	let td;
    	let img;
    	let img_src_value;
    	let t;

    	const block = {
    		c: function create() {
    			td = element("td");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "/images/dicefourblue.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "4");
    			attr_dev(img, "class", "svelte-gd96md");
    			add_location(img, file, 76, 22, 2533);
    			add_location(td, file, 75, 20, 2505);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, img);
    			append_dev(td, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(75:39) ",
    		ctx
    	});

    	return block;
    }

    // (71:39) 
    function create_if_block_3(ctx) {
    	let td;
    	let img;
    	let img_src_value;
    	let t;

    	const block = {
    		c: function create() {
    			td = element("td");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "/images/dicethreeblue.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "3");
    			attr_dev(img, "class", "svelte-gd96md");
    			add_location(img, file, 72, 22, 2370);
    			add_location(td, file, 71, 20, 2342);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, img);
    			append_dev(td, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(71:39) ",
    		ctx
    	});

    	return block;
    }

    // (67:39) 
    function create_if_block_2(ctx) {
    	let td;
    	let img;
    	let img_src_value;
    	let t;

    	const block = {
    		c: function create() {
    			td = element("td");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "/images/dicetwoblue.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "2");
    			attr_dev(img, "class", "svelte-gd96md");
    			add_location(img, file, 68, 22, 2209);
    			add_location(td, file, 67, 20, 2181);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, img);
    			append_dev(td, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(67:39) ",
    		ctx
    	});

    	return block;
    }

    // (63:41) 
    function create_if_block_1(ctx) {
    	let td;
    	let img;
    	let img_src_value;
    	let t;

    	const block = {
    		c: function create() {
    			td = element("td");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "/images/diceoneblue.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "1");
    			attr_dev(img, "class", "svelte-gd96md");
    			add_location(img, file, 64, 22, 2048);
    			add_location(td, file, 63, 20, 2020);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, img);
    			append_dev(td, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(63:41) ",
    		ctx
    	});

    	return block;
    }

    // (59:16) {#if dice === -1}
    function create_if_block(ctx) {
    	let td;
    	let img;
    	let img_src_value;
    	let t;

    	const block = {
    		c: function create() {
    			td = element("td");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "/images/nodiceblue.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "X");
    			attr_dev(img, "class", "svelte-gd96md");
    			add_location(img, file, 60, 22, 1886);
    			add_location(td, file, 59, 20, 1858);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, img);
    			append_dev(td, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(59:16) {#if dice === -1}",
    		ctx
    	});

    	return block;
    }

    // (58:12) {#each fight.defenderdice as dice}
    function create_each_block(ctx) {
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (/*dice*/ ctx[1] === -1) return create_if_block;
    		if (/*dice*/ ctx[1] === 1) return create_if_block_1;
    		if (/*dice*/ ctx[1] === 2) return create_if_block_2;
    		if (/*dice*/ ctx[1] === 3) return create_if_block_3;
    		if (/*dice*/ ctx[1] === 4) return create_if_block_4;
    		if (/*dice*/ ctx[1] === 5) return create_if_block_5;
    		if (/*dice*/ ctx[1] === 6) return create_if_block_6;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type_1(ctx))) {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) {
    				if_block.d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(58:12) {#each fight.defenderdice as dice}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let t0;
    	let t1_value = /*fight*/ ctx[0].turn + "";
    	let t1;
    	let t2;
    	let table;
    	let thead;
    	let tr0;
    	let th0;
    	let t4;
    	let th1;
    	let t6;
    	let th2;
    	let t8;
    	let th3;
    	let t10;
    	let tbody;
    	let tr1;
    	let td0;
    	let t12;
    	let t13;
    	let tr2;
    	let td1;
    	let t15;
    	let each_value_1 = /*fight*/ ctx[0].attackerdice;
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*fight*/ ctx[0].defenderdice;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("Fight ");
    			t1 = text(t1_value);
    			t2 = space();
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "Player";
    			t4 = space();
    			th1 = element("th");
    			th1.textContent = "1";
    			t6 = space();
    			th2 = element("th");
    			th2.textContent = "2";
    			t8 = space();
    			th3 = element("th");
    			th3.textContent = "3";
    			t10 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td0 = element("td");
    			td0.textContent = "Attacker";
    			t12 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t13 = space();
    			tr2 = element("tr");
    			td1 = element("td");
    			td1.textContent = "Defender";
    			t15 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(th0, file, 14, 12, 212);
    			set_style(th1, "text-align", "center");
    			add_location(th1, file, 15, 12, 241);
    			set_style(th2, "text-align", "center");
    			add_location(th2, file, 16, 12, 293);
    			set_style(th3, "text-align", "center");
    			add_location(th3, file, 17, 12, 345);
    			add_location(tr0, file, 13, 10, 194);
    			add_location(thead, file, 12, 8, 175);
    			add_location(td0, file, 22, 12, 488);
    			set_style(tr1, "color", "#ef233c");
    			add_location(tr1, file, 21, 10, 447);
    			add_location(td1, file, 56, 12, 1736);
    			set_style(tr2, "color", "#006494");
    			add_location(tr2, file, 55, 10, 1695);
    			add_location(tbody, file, 20, 8, 428);
    			add_location(table, file, 11, 4, 158);
    			attr_dev(div, "class", "fight svelte-gd96md");
    			add_location(div, file, 9, 0, 109);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    			append_dev(div, table);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, t4);
    			append_dev(tr0, th1);
    			append_dev(tr0, t6);
    			append_dev(tr0, th2);
    			append_dev(tr0, t8);
    			append_dev(tr0, th3);
    			append_dev(table, t10);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td0);
    			append_dev(tr1, t12);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(tr1, null);
    			}

    			append_dev(tbody, t13);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td1);
    			append_dev(tr2, t15);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tr2, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*fight*/ 1 && t1_value !== (t1_value = /*fight*/ ctx[0].turn + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*fight*/ 1) {
    				each_value_1 = /*fight*/ ctx[0].attackerdice;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(tr1, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*fight*/ 1) {
    				each_value = /*fight*/ ctx[0].defenderdice;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tr2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { fight = {
    		turn: -1,
    		attackerdice: [],
    		defenderdice: []
    	} } = $$props;

    	const writable_props = ["fight"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Fightstats> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Fightstats", $$slots, []);

    	$$self.$set = $$props => {
    		if ("fight" in $$props) $$invalidate(0, fight = $$props.fight);
    	};

    	$$self.$capture_state = () => ({ fight });

    	$$self.$inject_state = $$props => {
    		if ("fight" in $$props) $$invalidate(0, fight = $$props.fight);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [fight];
    }

    class Fightstats extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { fight: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Fightstats",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get fight() {
    		throw new Error("<Fightstats>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fight(value) {
    		throw new Error("<Fightstats>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\results.svelte generated by Svelte v3.22.2 */
    const file$1 = "src\\results.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (23:12) {:else}
    function create_else_block(ctx) {
    	let img;
    	let img_src_value;
    	let img_intro;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = "/images/arrowdown.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "dropdown");
    			add_location(img, file$1, 23, 12, 591);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		i: function intro(local) {
    			if (!img_intro) {
    				add_render_callback(() => {
    					img_intro = create_in_transition(img, fade, {});
    					img_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(23:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (21:12) {#if showDetails}
    function create_if_block_1$1(ctx) {
    	let img;
    	let img_src_value;
    	let img_intro;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = "/images/arrowup.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "dropdown");
    			add_location(img, file$1, 21, 12, 502);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		i: function intro(local) {
    			if (!img_intro) {
    				add_render_callback(() => {
    					img_intro = create_in_transition(img, fade, {});
    					img_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(21:12) {#if showDetails}",
    		ctx
    	});

    	return block;
    }

    // (29:4) {#if showDetails}
    function create_if_block$1(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*fights*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*fights*/ 4) {
    				each_value = /*fights*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(29:4) {#if showDetails}",
    		ctx
    	});

    	return block;
    }

    // (30:8) {#each fights as fight}
    function create_each_block$1(ctx) {
    	let current;

    	const fightstats = new Fightstats({
    			props: { fight: /*fight*/ ctx[5] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(fightstats.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(fightstats, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const fightstats_changes = {};
    			if (dirty & /*fights*/ 4) fightstats_changes.fight = /*fight*/ ctx[5];
    			fightstats.$set(fightstats_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fightstats.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fightstats.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(fightstats, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(30:8) {#each fights as fight}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let current;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*showDetails*/ ctx[3]) return create_if_block_1$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*showDetails*/ ctx[3] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			if_block0.c();
    			t0 = text("\r\n        Round ");
    			t1 = text(/*round*/ ctx[0]);
    			t2 = text(" : ");
    			t3 = text(/*message*/ ctx[1]);
    			t4 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div0, "class", "dropdown u-pull-left svelte-10oayxv");
    			add_location(div0, file$1, 19, 8, 423);
    			set_style(div1, "width", "278px");
    			set_style(div1, "cursor", "pointer");
    			add_location(div1, file$1, 18, 4, 344);
    			attr_dev(div2, "class", "results svelte-10oayxv");
    			add_location(div2, file$1, 17, 0, 317);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			if_block0.m(div0, null);
    			append_dev(div1, t0);
    			append_dev(div1, t1);
    			append_dev(div1, t2);
    			append_dev(div1, t3);
    			append_dev(div2, t4);
    			if (if_block1) if_block1.m(div2, null);
    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(div1, "click", /*toggleDetails*/ ctx[4], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div0, null);
    				}
    			}

    			if (!current || dirty & /*round*/ 1) set_data_dev(t1, /*round*/ ctx[0]);
    			if (!current || dirty & /*message*/ 2) set_data_dev(t3, /*message*/ ctx[1]);

    			if (/*showDetails*/ ctx[3]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*showDetails*/ 8) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div2, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { round } = $$props;
    	let { message } = $$props;
    	let { fights = [] } = $$props;
    	let showDetails = false;

    	const toggleDetails = () => {
    		$$invalidate(3, showDetails = !showDetails);
    	};

    	const writable_props = ["round", "message", "fights"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Results> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Results", $$slots, []);

    	$$self.$set = $$props => {
    		if ("round" in $$props) $$invalidate(0, round = $$props.round);
    		if ("message" in $$props) $$invalidate(1, message = $$props.message);
    		if ("fights" in $$props) $$invalidate(2, fights = $$props.fights);
    	};

    	$$self.$capture_state = () => ({
    		fade,
    		Fightstats,
    		round,
    		message,
    		fights,
    		showDetails,
    		toggleDetails
    	});

    	$$self.$inject_state = $$props => {
    		if ("round" in $$props) $$invalidate(0, round = $$props.round);
    		if ("message" in $$props) $$invalidate(1, message = $$props.message);
    		if ("fights" in $$props) $$invalidate(2, fights = $$props.fights);
    		if ("showDetails" in $$props) $$invalidate(3, showDetails = $$props.showDetails);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [round, message, fights, showDetails, toggleDetails];
    }

    class Results extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { round: 0, message: 1, fights: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Results",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*round*/ ctx[0] === undefined && !("round" in props)) {
    			console.warn("<Results> was created without expected prop 'round'");
    		}

    		if (/*message*/ ctx[1] === undefined && !("message" in props)) {
    			console.warn("<Results> was created without expected prop 'message'");
    		}
    	}

    	get round() {
    		throw new Error("<Results>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set round(value) {
    		throw new Error("<Results>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get message() {
    		throw new Error("<Results>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set message(value) {
    		throw new Error("<Results>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get fights() {
    		throw new Error("<Results>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fights(value) {
    		throw new Error("<Results>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Input.svelte generated by Svelte v3.22.2 */
    const file$2 = "src\\Input.svelte";

    function create_fragment$2(ctx) {
    	let div3;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div1;
    	let t1;
    	let t2;
    	let div2;
    	let img1;
    	let img1_src_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			img0 = element("img");
    			t0 = space();
    			div1 = element("div");
    			t1 = text(/*troops*/ ctx[0]);
    			t2 = space();
    			div2 = element("div");
    			img1 = element("img");
    			if (img0.src !== (img0_src_value = "/images/minus.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "minus");
    			attr_dev(img0, "class", "svelte-sg489p");
    			add_location(img0, file$2, 25, 8, 500);
    			attr_dev(div0, "class", "reduct u-pull-left svelte-sg489p");
    			add_location(div0, file$2, 24, 4, 434);
    			attr_dev(div1, "class", "value u-pull-left svelte-sg489p");
    			add_location(div1, file$2, 27, 4, 559);
    			if (img1.src !== (img1_src_value = "/images/plus.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "plus");
    			attr_dev(img1, "class", "svelte-sg489p");
    			add_location(img1, file$2, 29, 8, 670);
    			attr_dev(div2, "class", "add u-pull-left svelte-sg489p");
    			add_location(div2, file$2, 28, 4, 610);
    			attr_dev(div3, "class", "inputfield svelte-sg489p");
    			add_location(div3, file$2, 23, 0, 404);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, img0);
    			append_dev(div3, t0);
    			append_dev(div3, div1);
    			append_dev(div1, t1);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			append_dev(div2, img1);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(div0, "click", /*reductTroops*/ ctx[1], false, false, false),
    				listen_dev(div2, "click", /*addTroops*/ ctx[2], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*troops*/ 1) set_data_dev(t1, /*troops*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { troops = 0 } = $$props;
    	const dispatch = createEventDispatcher();

    	const reductTroops = () => {
    		if (troops > 0) $$invalidate(0, troops--, troops);
    		changeValue();
    	};

    	const addTroops = () => {
    		$$invalidate(0, troops++, troops);
    		changeValue();
    	};

    	const changeValue = () => {
    		dispatch("valuechange", troops);
    	};

    	const writable_props = ["troops"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Input> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Input", $$slots, []);

    	$$self.$set = $$props => {
    		if ("troops" in $$props) $$invalidate(0, troops = $$props.troops);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		troops,
    		dispatch,
    		reductTroops,
    		addTroops,
    		changeValue
    	});

    	$$self.$inject_state = $$props => {
    		if ("troops" in $$props) $$invalidate(0, troops = $$props.troops);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [troops, reductTroops, addTroops];
    }

    class Input extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { troops: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Input",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get troops() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set troops(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.22.2 */

    const { console: console_1 } = globals;
    const file$3 = "src\\App.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    // (188:28) 
    function create_if_block_1$2(ctx) {
    	let h3;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "The defender won!";
    			add_location(h3, file$3, 188, 5, 3981);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(188:28) ",
    		ctx
    	});

    	return block;
    }

    // (186:5) {#if winner === 0}
    function create_if_block$2(ctx) {
    	let h3;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "The attacker won!";
    			add_location(h3, file$3, 186, 5, 3918);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(186:5) {#if winner === 0}",
    		ctx
    	});

    	return block;
    }

    // (196:4) {#each boxes as result }
    function create_each_block$2(ctx) {
    	let current;

    	const results = new Results({
    			props: {
    				round: /*result*/ ctx[20].round,
    				message: /*result*/ ctx[20].message,
    				fights: /*result*/ ctx[20].fights
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(results.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(results, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const results_changes = {};
    			if (dirty & /*boxes*/ 8) results_changes.round = /*result*/ ctx[20].round;
    			if (dirty & /*boxes*/ 8) results_changes.message = /*result*/ ctx[20].message;
    			if (dirty & /*boxes*/ 8) results_changes.fights = /*result*/ ctx[20].fights;
    			results.$set(results_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(results.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(results.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(results, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(196:4) {#each boxes as result }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let main;
    	let div24;
    	let div1;
    	let div0;
    	let h1;
    	let t1;
    	let div3;
    	let div2;
    	let p;
    	let t3;
    	let div6;
    	let div5;
    	let div4;
    	let t5;
    	let div9;
    	let div8;
    	let div7;
    	let t6;
    	let div12;
    	let div11;
    	let div10;
    	let t8;
    	let div15;
    	let div14;
    	let div13;
    	let t9;
    	let div18;
    	let div17;
    	let div16;
    	let button0;
    	let t11;
    	let button1;
    	let t13;
    	let div21;
    	let div20;
    	let div19;
    	let t14;
    	let div23;
    	let div22;
    	let current;
    	let dispose;

    	const input0 = new Input({
    			props: { troops: /*attackers*/ ctx[0] },
    			$$inline: true
    		});

    	input0.$on("valuechange", /*setAtt*/ ctx[6]);

    	const input1 = new Input({
    			props: { troops: /*defenders*/ ctx[1] },
    			$$inline: true
    		});

    	input1.$on("valuechange", /*setDef*/ ctx[7]);

    	function select_block_type(ctx, dirty) {
    		if (/*winner*/ ctx[2] === 0) return create_if_block$2;
    		if (/*winner*/ ctx[2] === 1) return create_if_block_1$2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);
    	let each_value = /*boxes*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			main = element("main");
    			div24 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Risk Dice";
    			t1 = space();
    			div3 = element("div");
    			div2 = element("div");
    			p = element("p");
    			p.textContent = "Simply input the number of attackers and defenders and click fight to see who will win.";
    			t3 = space();
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div4.textContent = "attackers";
    			t5 = space();
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			create_component(input0.$$.fragment);
    			t6 = space();
    			div12 = element("div");
    			div11 = element("div");
    			div10 = element("div");
    			div10.textContent = "defenders";
    			t8 = space();
    			div15 = element("div");
    			div14 = element("div");
    			div13 = element("div");
    			create_component(input1.$$.fragment);
    			t9 = space();
    			div18 = element("div");
    			div17 = element("div");
    			div16 = element("div");
    			button0 = element("button");
    			button0.textContent = "fight";
    			t11 = space();
    			button1 = element("button");
    			button1.textContent = "reset";
    			t13 = space();
    			div21 = element("div");
    			div20 = element("div");
    			div19 = element("div");
    			if (if_block) if_block.c();
    			t14 = space();
    			div23 = element("div");
    			div22 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h1, "class", "centered svelte-h1nypz");
    			add_location(h1, file$3, 141, 4, 2686);
    			attr_dev(div0, "class", "twelve columns");
    			add_location(div0, file$3, 140, 3, 2652);
    			attr_dev(div1, "class", "row");
    			add_location(div1, file$3, 139, 2, 2630);
    			attr_dev(p, "class", "centered svelte-h1nypz");
    			add_location(p, file$3, 146, 4, 2802);
    			attr_dev(div2, "class", "twelve columns");
    			add_location(div2, file$3, 145, 3, 2768);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file$3, 144, 2, 2746);
    			attr_dev(div4, "class", "centered svelte-h1nypz");
    			add_location(div4, file$3, 152, 4, 2996);
    			attr_dev(div5, "class", "twelve columns");
    			add_location(div5, file$3, 151, 3, 2962);
    			attr_dev(div6, "class", "row");
    			add_location(div6, file$3, 150, 2, 2940);
    			attr_dev(div7, "class", "centered svelte-h1nypz");
    			add_location(div7, file$3, 157, 4, 3114);
    			attr_dev(div8, "class", "twelve columns");
    			add_location(div8, file$3, 156, 3, 3080);
    			attr_dev(div9, "class", "row");
    			add_location(div9, file$3, 155, 2, 3058);
    			attr_dev(div10, "class", "centered svelte-h1nypz");
    			set_style(div10, "margin-top", "5%");
    			add_location(div10, file$3, 164, 4, 3287);
    			attr_dev(div11, "class", "twelve columns");
    			add_location(div11, file$3, 163, 3, 3253);
    			attr_dev(div12, "class", "row");
    			add_location(div12, file$3, 162, 2, 3231);
    			attr_dev(div13, "class", "centered svelte-h1nypz");
    			add_location(div13, file$3, 169, 4, 3429);
    			attr_dev(div14, "class", "twelve columns");
    			add_location(div14, file$3, 168, 3, 3395);
    			attr_dev(div15, "class", "row");
    			add_location(div15, file$3, 167, 2, 3373);
    			attr_dev(button0, "class", "button");
    			add_location(button0, file$3, 177, 5, 3656);
    			attr_dev(button1, "class", "button");
    			add_location(button1, file$3, 178, 5, 3717);
    			attr_dev(div16, "class", "centered svelte-h1nypz");
    			set_style(div16, "margin-top", "10%");
    			add_location(div16, file$3, 176, 4, 3602);
    			attr_dev(div17, "class", "twelve columns");
    			add_location(div17, file$3, 175, 3, 3568);
    			attr_dev(div18, "class", "row");
    			add_location(div18, file$3, 174, 2, 3546);
    			attr_dev(div19, "class", "centered svelte-h1nypz");
    			add_location(div19, file$3, 184, 4, 3864);
    			attr_dev(div20, "class", "twelve columns");
    			add_location(div20, file$3, 183, 3, 3830);
    			attr_dev(div21, "class", "row");
    			add_location(div21, file$3, 182, 2, 3808);
    			attr_dev(div22, "class", "twelve columns");
    			add_location(div22, file$3, 194, 3, 4078);
    			attr_dev(div23, "class", "row");
    			add_location(div23, file$3, 193, 2, 4056);
    			attr_dev(div24, "class", "container");
    			add_location(div24, file$3, 138, 1, 2603);
    			add_location(main, file$3, 137, 0, 2594);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div24);
    			append_dev(div24, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			append_dev(div24, t1);
    			append_dev(div24, div3);
    			append_dev(div3, div2);
    			append_dev(div2, p);
    			append_dev(div24, t3);
    			append_dev(div24, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div24, t5);
    			append_dev(div24, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			mount_component(input0, div7, null);
    			append_dev(div24, t6);
    			append_dev(div24, div12);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div24, t8);
    			append_dev(div24, div15);
    			append_dev(div15, div14);
    			append_dev(div14, div13);
    			mount_component(input1, div13, null);
    			append_dev(div24, t9);
    			append_dev(div24, div18);
    			append_dev(div18, div17);
    			append_dev(div17, div16);
    			append_dev(div16, button0);
    			append_dev(div16, t11);
    			append_dev(div16, button1);
    			append_dev(div24, t13);
    			append_dev(div24, div21);
    			append_dev(div21, div20);
    			append_dev(div20, div19);
    			if (if_block) if_block.m(div19, null);
    			append_dev(div24, t14);
    			append_dev(div24, div23);
    			append_dev(div23, div22);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div22, null);
    			}

    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(button0, "click", /*fight*/ ctx[4], false, false, false),
    				listen_dev(button1, "click", /*reset*/ ctx[5], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			const input0_changes = {};
    			if (dirty & /*attackers*/ 1) input0_changes.troops = /*attackers*/ ctx[0];
    			input0.$set(input0_changes);
    			const input1_changes = {};
    			if (dirty & /*defenders*/ 2) input1_changes.troops = /*defenders*/ ctx[1];
    			input1.$set(input1_changes);

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div19, null);
    				}
    			}

    			if (dirty & /*boxes*/ 8) {
    				each_value = /*boxes*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div22, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(input0.$$.fragment, local);
    			transition_in(input1.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(input0.$$.fragment, local);
    			transition_out(input1.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(input0);
    			destroy_component(input1);

    			if (if_block) {
    				if_block.d();
    			}

    			destroy_each(each_blocks, detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function dice() {
    	let dice = Math.ceil(Math.random() * 6);

    	//console.log(dice);
    	return dice;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let attackers = 0;
    	let defenders = 0;
    	let attackUnit = 0;
    	let defendUnit = 0;
    	let winner = -1;
    	let attackDice = [-1, -1, -1];
    	let defendDice = [-1, -1, -1];
    	let boxes = [];
    	let round = 0;
    	let fightnumber = 0;
    	let fights = [];

    	const fight = () => {
    		attackDice = [-1, -1, -1];
    		defendDice = [-1, -1, -1];
    		setFightingSoliders();

    		//console.log(`attackUnit ${attackUnit} \t defendUnit ${defendUnit}`);
    		throwDice();

    		attackDice.sort(function (a, b) {
    			return b - a;
    		});

    		defendDice.sort(function (a, b) {
    			return b - a;
    		});

    		compareResults();
    		setFightdata();

    		if (attackers === 0) {
    			$$invalidate(2, winner = 1);
    			setResults("The defender won!");
    			fightnumber = 0;
    		} else if (defenders === 0) {
    			$$invalidate(2, winner = 0);
    			setResults("The attacker won!");
    			fightnumber = 0;
    		} else {
    			fight();
    		}
    	};

    	function setResults(msg) {
    		round++;
    		let newBox = { round, message: msg, fights };
    		$$invalidate(3, boxes = [newBox, ...boxes]);
    		console.log(boxes);
    		fights = [];
    	}

    	function setFightdata() {
    		fightnumber++;

    		let newFightdata = {
    			turn: fightnumber,
    			attackerdice: attackDice,
    			defenderdice: defendDice
    		};

    		fights = [...fights, newFightdata];
    	}

    	function setFightingSoliders() {
    		if (attackers >= 3) {
    			attackUnit = 3;
    			$$invalidate(0, attackers = attackers - 3);
    		} else {
    			attackUnit = attackers;
    			$$invalidate(0, attackers = attackers - attackUnit);
    		}

    		if (defenders >= 2) {
    			defendUnit = 2;
    			$$invalidate(1, defenders = defenders - 2);
    		} else {
    			defendUnit = defenders;
    			$$invalidate(1, defenders = defenders - defendUnit);
    		}
    	}

    	function throwDice() {
    		for (let i = 0; i < defendUnit; i++) {
    			defendDice[i] = dice();
    		}

    		for (let i = 0; i < attackUnit; i++) {
    			attackDice[i] = dice();
    		}
    	}

    	function compareResults() {
    		for (let i = 0; i < 2; i++) {
    			if (attackDice[i] !== -1 && defendDice[i] !== -1) {
    				if (attackDice[i] > defendDice[i]) {
    					defendUnit = defendUnit - 1;
    				} else {
    					attackUnit = attackUnit - 1;
    				}
    			}
    		}

    		$$invalidate(0, attackers = attackers + attackUnit);
    		$$invalidate(1, defenders = defenders + defendUnit);
    	}

    	const reset = () => {
    		$$invalidate(0, attackers = 0);
    		$$invalidate(1, defenders = 0);
    		attackUnit = 0;
    		defendUnit = 0;
    		$$invalidate(2, winner = -1);
    	};

    	const setAtt = e => {
    		$$invalidate(0, attackers = e.detail);
    	};

    	const setDef = e => {
    		$$invalidate(1, defenders = e.detail);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$capture_state = () => ({
    		Results,
    		Input,
    		attackers,
    		defenders,
    		attackUnit,
    		defendUnit,
    		winner,
    		attackDice,
    		defendDice,
    		boxes,
    		round,
    		fightnumber,
    		fights,
    		fight,
    		setResults,
    		setFightdata,
    		setFightingSoliders,
    		throwDice,
    		dice,
    		compareResults,
    		reset,
    		setAtt,
    		setDef
    	});

    	$$self.$inject_state = $$props => {
    		if ("attackers" in $$props) $$invalidate(0, attackers = $$props.attackers);
    		if ("defenders" in $$props) $$invalidate(1, defenders = $$props.defenders);
    		if ("attackUnit" in $$props) attackUnit = $$props.attackUnit;
    		if ("defendUnit" in $$props) defendUnit = $$props.defendUnit;
    		if ("winner" in $$props) $$invalidate(2, winner = $$props.winner);
    		if ("attackDice" in $$props) attackDice = $$props.attackDice;
    		if ("defendDice" in $$props) defendDice = $$props.defendDice;
    		if ("boxes" in $$props) $$invalidate(3, boxes = $$props.boxes);
    		if ("round" in $$props) round = $$props.round;
    		if ("fightnumber" in $$props) fightnumber = $$props.fightnumber;
    		if ("fights" in $$props) fights = $$props.fights;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [attackers, defenders, winner, boxes, fight, reset, setAtt, setDef];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
