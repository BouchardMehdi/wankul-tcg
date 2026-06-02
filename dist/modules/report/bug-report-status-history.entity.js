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
exports.BugReportStatusHistory = void 0;
const typeorm_1 = require("typeorm");
const bug_report_entity_1 = require("./bug-report.entity");
let BugReportStatusHistory = class BugReportStatusHistory {
    id;
    report;
    reportId;
    fromStatus;
    toStatus;
    note;
    changedBy;
    changedAt;
};
exports.BugReportStatusHistory = BugReportStatusHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], BugReportStatusHistory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => bug_report_entity_1.BugReport, { nullable: false, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'reportId' }),
    __metadata("design:type", bug_report_entity_1.BugReport)
], BugReportStatusHistory.prototype, "report", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], BugReportStatusHistory.prototype, "reportId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], BugReportStatusHistory.prototype, "fromStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], BugReportStatusHistory.prototype, "toStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], BugReportStatusHistory.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 80, default: 'system' }),
    __metadata("design:type", String)
], BugReportStatusHistory.prototype, "changedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BugReportStatusHistory.prototype, "changedAt", void 0);
exports.BugReportStatusHistory = BugReportStatusHistory = __decorate([
    (0, typeorm_1.Entity)('bug_report_status_history')
], BugReportStatusHistory);
//# sourceMappingURL=bug-report-status-history.entity.js.map