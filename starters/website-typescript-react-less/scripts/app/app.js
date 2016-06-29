var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define("components/layout", ["require", "exports"], function (require, exports) {
    "use strict";
    var Layout = (function (_super) {
        __extends(Layout, _super);
        function Layout() {
            _super.apply(this, arguments);
        }
        Layout.prototype.render = function () {
            return React.createElement("div", null, React.createElement("h1", null, "typescript-less-react"), React.createElement("h2", null, "tasksmith starter project"));
        };
        return Layout;
    }(React.Component));
    exports.Layout = Layout;
});
define("index", ["require", "exports", "components/layout"], function (require, exports, layout_1) {
    "use strict";
    exports.Layout = layout_1.Layout;
});
