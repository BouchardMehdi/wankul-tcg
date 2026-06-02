"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BugReport = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
const bug_report_status_history_entity_1 = require("./bug-report-status-history.entity");
let BugReport = class BugReport {
    id;
    user;
    userId;
    usernameSnapshot;
    emailSnapshot;
    category;
    page;
    feature;
    priority;
    description;
    reproductionSteps;
    currentUrl;
    browserInfo;
    screenshotUrl;
    status;
    resolutionNote;
    treatedAt;
    treatedBy;
    fixedAt;
    fixedBy;
    closedAt;
    closedBy;
    lastStatusChangedBy;
    createdAt;
    updatedAt;
    histories;
};
exports.BugReport = BugReport;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], BugReport.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: false, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], BugReport.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], BugReport.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 40 }),
    __metadata("design:type", String)
], BugReport.prototype, "usernameSnapshot", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BugReport.prototype, "emailSnapshot", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 24 }),
    __metadata("design:type", String)
], BugReport.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 60 }),
    __metadata("design:type", String)
], BugReport.prototype, "page", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 80 }),
    __metadata("design:type", String)
], BugReport.prototype, "feature", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 24 }),
    __metadata("design:type", String)
], BugReport.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], BugReport.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], BugReport.prototype, "reproductionSteps", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], BugReport.prototype, "currentUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 1000, nullable: true }),
    __metadata("design:type", Object)
], BugReport.prototype, "browserInfo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], BugReport.prototype, "screenshotUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'open' }),
    __metadata("design:type", String)
], BugReport.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], BugReport.prototype, "resolutionNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], BugReport.prototype, "treatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 80, nullable: true }),
    __metadata("design:type", Object)
], BugReport.prototype, "treatedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], BugReport.prototype, "fixedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 80, nullable: true }),
    __metadata("design:type", Object)
], BugReport.prototype, "fixedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], BugReport.prototype, "closedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 80, nullable: true }),
    __metadata("design:type", Object)
], BugReport.prototype, "closedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 80, nullable: true }),
    __metadata("design:type", Object)
], BugReport.prototype, "lastStatusChangedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BugReport.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], BugReport.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => bug_report_status_history_entity_1.BugReportStatusHistory, (history) => history.report, {
        cascade: false,
    }),
    __metadata("design:type", Array)
], BugReport.prototype, "histories", void 0);
exports.BugReport = BugReport = __decorate([
    (0, typeorm_1.Entity)('bug_reports')
], BugReport);
//# sourceMappingURL=bug-report.entity.js.map